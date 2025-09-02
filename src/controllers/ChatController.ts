import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class ChatController {
  
  // 获取用户的聊天会话列表
  public async getSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      const sessions = await prisma.chatSession.findMany({
        where: {
          OR: [
            { participant1Id: userId },
            { participant2Id: userId }
          ]
        },
        include: {
          participant1: {
            select: { id: true, username: true, nickname: true, avatar: true }
          },
          participant2: {
            select: { id: true, username: true, nickname: true, avatar: true }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              messageType: true,
              createdAt: true,
              isRead: true,
              senderId: true
            }
          },
          _count: {
            select: {
              messages: {
                where: {
                  isRead: false,
                  senderId: { not: userId }
                }
              }
            }
          }
        },
        orderBy: { lastActiveAt: 'desc' }
      });

      const formattedSessions = sessions.map(session => ({
        id: session.id,
        otherUser: session.participant1Id === userId 
          ? session.participant2 
          : session.participant1,
        lastMessage: session.messages[0] || null,
        unreadCount: session._count.messages,
        lastActiveAt: session.lastActiveAt
      }));

      res.json({
        success: true,
        data: formattedSessions
      });
    } catch (error) {
      console.error('获取聊天会话失败:', error);
      res.status(500).json({
        success: false,
        error: { message: '获取聊天会话失败' }
      });
    }
  }

  // 创建或获取聊天会话
  public async createOrGetSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { otherUserId } = req.body;

      if (!otherUserId || otherUserId === userId) {
        return res.status(400).json({
          success: false,
          error: { message: '无效的用户ID' }
        });
      }

      // 检查对方用户是否存在
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true, username: true, nickname: true, avatar: true }
      });

      if (!otherUser) {
        return res.status(404).json({
          success: false,
          error: { message: '用户不存在' }
        });
      }

      // 查找现有会话
      let session = await prisma.chatSession.findFirst({
        where: {
          OR: [
            { participant1Id: userId, participant2Id: otherUserId },
            { participant1Id: otherUserId, participant2Id: userId }
          ]
        },
        include: {
          participant1: {
            select: { id: true, username: true, nickname: true, avatar: true }
          },
          participant2: {
            select: { id: true, username: true, nickname: true, avatar: true }
          }
        }
      });

      // 如果不存在则创建新会话
      if (!session) {
        session = await prisma.chatSession.create({
          data: {
            participant1Id: userId,
            participant2Id: otherUserId
          },
          include: {
            participant1: {
              select: { id: true, username: true, nickname: true, avatar: true }
            },
            participant2: {
              select: { id: true, username: true, nickname: true, avatar: true }
            }
          }
        });
      }

      res.json({
        success: true,
        data: {
          id: session.id,
          otherUser: session.participant1Id === userId 
            ? session.participant2 
            : session.participant1,
          createdAt: session.createdAt
        }
      });
    } catch (error) {
      console.error('创建聊天会话失败:', error);
      res.status(500).json({
        success: false,
        error: { message: '创建聊天会话失败' }
      });
    }
  }

  // 获取聊天消息历史
  public async getMessages(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { sessionId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      // 验证用户是否有权限访问此会话
      const session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          OR: [
            { participant1Id: userId },
            { participant2Id: userId }
          ]
        }
      });

      if (!session) {
        return res.status(403).json({
          success: false,
          error: { message: '无权限访问此会话' }
        });
      }

      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        include: {
          sender: {
            select: { id: true, username: true, nickname: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      });

      res.json({
        success: true,
        data: messages.reverse() // 按时间正序返回
      });
    } catch (error) {
      console.error('获取消息历史失败:', error);
      res.status(500).json({
        success: false,
        error: { message: '获取消息历史失败' }
      });
    }
  }

  // 标记消息为已读
  public async markAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { sessionId } = req.params;

      // 验证权限
      const session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          OR: [
            { participant1Id: userId },
            { participant2Id: userId }
          ]
        }
      });

      if (!session) {
        return res.status(403).json({
          success: false,
          error: { message: '无权限访问此会话' }
        });
      }

      // 标记未读消息为已读
      await prisma.chatMessage.updateMany({
        where: {
          sessionId,
          senderId: { not: userId },
          isRead: false
        },
        data: { isRead: true }
      });

      res.json({
        success: true,
        message: '消息已标记为已读'
      });
    } catch (error) {
      console.error('标记已读失败:', error);
      res.status(500).json({
        success: false,
        error: { message: '标记已读失败' }
      });
    }
  }

  // 获取系统通知
  public async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 20 } = req.query;

      const notifications = await prisma.systemMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      });

      const unreadCount = await prisma.systemMessage.count({
        where: { userId, isRead: false }
      });

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount
        }
      });
    } catch (error) {
      console.error('获取通知失败:', error);
      res.status(500).json({
        success: false,
        error: { message: '获取通知失败' }
      });
    }
  }

  // 标记通知为已读
  public async markNotificationAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await prisma.systemMessage.updateMany({
        where: { id, userId },
        data: { isRead: true }
      });

      res.json({
        success: true,
        message: '通知已标记为已读'
      });
    } catch (error) {
      console.error('标记通知已读失败:', error);
      res.status(500).json({
        success: false,
        error: { message: '标记通知已读失败' }
      });
    }
  }
}

export default ChatController;
