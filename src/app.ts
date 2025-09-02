import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import routes from './routes';
import SocketService from './services/SocketService';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// CORS 配置
app.use(cors({
  origin: [
    process.env.CLIENT_ORIGIN || 'http://localhost:9000',
    process.env.ADMIN_ORIGIN || 'http://localhost:8080'
  ],
  credentials: true
}));

// 日志中间件
app.use(morgan('combined'));

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'jincheng-campus-api'
  });
});

// API 路由
app.use('/api', routes);

// 404 处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 创建 HTTP 服务器
const httpServer = createServer(app);

// 初始化 Socket.IO 服务
const socketService = new SocketService(httpServer);

// 启动服务器
httpServer.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`📚 API文档: http://localhost:${PORT}/api-docs`);
  console.log(`💬 WebSocket 服务已启动`);
});

export default app;
export { socketService };
