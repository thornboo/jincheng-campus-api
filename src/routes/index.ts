import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import lostFoundRoutes from './lostFound';
import idleTradeRoutes from './idleTrade';
import partTimeRoutes from './partTime';
import campusErrandRoutes from './campusErrand';
import commentRoutes from './comment';
import uploadRoutes from './upload';
import chatRoutes from './chat';
import forumRoutes from './forum';

const router = Router();

// API 版本
const API_VERSION = 'v1';

// 路由挂载
router.use(`/${API_VERSION}/auth`, authRoutes);
router.use(`/${API_VERSION}/user`, userRoutes);
router.use(`/${API_VERSION}/lost-found`, lostFoundRoutes);
router.use(`/${API_VERSION}/idle-trade`, idleTradeRoutes);
router.use(`/${API_VERSION}/part-time`, partTimeRoutes);
router.use(`/${API_VERSION}/campus-errand`, campusErrandRoutes);
router.use(`/${API_VERSION}/comments`, commentRoutes);
router.use(`/${API_VERSION}/upload`, uploadRoutes);
router.use(`/${API_VERSION}/chat`, chatRoutes);
router.use(`/${API_VERSION}/forum`, forumRoutes);

// API 根路径
router.get('/', (req, res) => {
  res.json({
    message: '🎓 金橙校园 API 服务',
    version: API_VERSION,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: `/${API_VERSION}/auth`,
      user: `/${API_VERSION}/user`,
      lostFound: `/${API_VERSION}/lost-found`,
      idleTrade: `/${API_VERSION}/idle-trade`,
      partTime: `/${API_VERSION}/part-time`,
      campusErrand: `/${API_VERSION}/campus-errand`,
      comments: `/${API_VERSION}/comments`,
      upload: `/${API_VERSION}/upload`,
      chat: `/${API_VERSION}/chat`
      , forum: `/${API_VERSION}/forum`
    }
  });
});

export default router;
