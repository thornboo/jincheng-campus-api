import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SocketService {
  private io: SocketIOServer;
  private redisClient;
  private redisSubClient;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: [
          process.env.CLIENT_ORIGIN || 'http://localhost:9000',
          process.env.ADMIN_ORIGIN || 'http://localhost:8080'
        ],
        credentials: true
      }
    });

    this.setupRedis();
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private async setupRedis() {
    // 创建 Redis 客户端
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.redisSubClient = this.redisClient.duplicate();

    await Promise.all([
      this.redisClient.connect(),
      this.redisSubClient.connect()
    ]);

    // 设置 Redis 适配器
    this.io.adapter(createAdapter(this.redisClient, this.redisSubClient));
  }

  private setupMiddleware() {
    // JWT 认证中间件
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, username: true, nickname: true, avatar: true }
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`用户 ${socket.data.user.username} 已连接`);

      // 加入用户专属房间
      socket.join(`user:${socket.data.user.id}`);

      // 处理加入聊天会话
      socket.on('join_chat', async (sessionId: string) => {
        try {
          // 验证用户是否有权限加入此会话
          const session = await prisma.chatSession.findFirst({
            where: {
              id: sessionId,
              OR: [
                { participant1Id: socket.data.user.id },
                { participant2Id: socket.data.user.id }
              ]
            }
          });

          if (session) {
            socket.join(`chat:${sessionId}`);
            socket.emit('joined_chat', sessionId);
          } else {
            socket.emit('error', '无权限加入此聊天');
          }
        } catch (error) {
          socket.emit('error', '加入聊天失败');
        }
      });

      // 处理发送消息
      socket.on('send_message', async (data: {
        sessionId: string;
        content: string;
        messageType?: string;
      }) => {
        try {
          const { sessionId, content, messageType = 'TEXT' } = data;

          // 验证会话权限
          const session = await prisma.chatSession.findFirst({
            where: {
              id: sessionId,
              OR: [
                { participant1Id: socket.data.user.id },
                { participant2Id: socket.data.user.id }
              ]
            },
            include: {
              participant1: { select: { id: true, username: true, nickname: true } },
              participant2: { select: { id: true, username: true, nickname: true } }
            }
          });

          if (!session) {
            socket.emit('error', '会话不存在或无权限');
            return;
          }

          // 保存消息到数据库
          const message = await prisma.chatMessage.create({
            data: {
              sessionId,
              senderId: socket.data.user.id,
              content,
              messageType: messageType as any
            },
            include: {
              sender: {
                select: { id: true, username: true, nickname: true, avatar: true }
              }
            }
          });

          // 更新会话最后活跃时间
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { 
              lastActiveAt: new Date(),
              lastMessageId: message.id
            }
          });

          // 发送消息到会话房间
          this.io.to(`chat:${sessionId}`).emit('new_message', {
            id: message.id,
            content: message.content,
            messageType: message.messageType,
            sender: message.sender,
            createdAt: message.createdAt,
            sessionId: sessionId
          });

          // 发送通知给离线用户
          const receiverId = session.participant1Id === socket.data.user.id 
            ? session.participant2Id 
            : session.participant1Id;
          
          this.sendNotificationToUser(receiverId, {
            type: 'new_message',
            title: '新消息',
            content: `${socket.data.user.nickname || socket.data.user.username}: ${content}`,
            sessionId: sessionId
          });

        } catch (error) {
          console.error('发送消息失败:', error);
          socket.emit('error', '发送消息失败');
        }
      });

      // 处理消息已读
      socket.on('mark_read', async (data: { sessionId: string; messageIds: string[] }) => {
        try {
          await prisma.chatMessage.updateMany({
            where: {
              id: { in: data.messageIds },
              sessionId: data.sessionId,
              senderId: { not: socket.data.user.id }
            },
            data: { isRead: true }
          });

          // 通知发送者消息已读
          socket.to(`chat:${data.sessionId}`).emit('messages_read', data.messageIds);
        } catch (error) {
          console.error('标记已读失败:', error);
        }
      });

      // 处理断开连接
      socket.on('disconnect', () => {
        console.log(`用户 ${socket.data.user.username} 已断开连接`);
      });
    });
  }

  // 发送通知给指定用户
  public async sendNotificationToUser(userId: string, notification: any) {
    // 尝试实时推送
    this.io.to(`user:${userId}`).emit('notification', notification);
    
    // 同时保存到数据库作为系统消息
    await prisma.systemMessage.create({
      data: {
        userId,
        title: notification.title,
        content: notification.content,
        type: 'NOTIFICATION'
      }
    });
  }

  // 获取在线用户数
  public async getOnlineUsers(): Promise<number> {
    const sockets = await this.io.fetchSockets();
    return sockets.length;
  }

  // 发送系统广播
  public async sendSystemBroadcast(message: string) {
    this.io.emit('system_broadcast', {
      message,
      timestamp: new Date()
    });
  }
}

export default SocketService;
