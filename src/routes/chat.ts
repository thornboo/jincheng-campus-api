import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const chatController = new ChatController();

/**
 * @route GET /api/v1/chat/sessions
 * @desc 获取用户的聊天会话列表
 * @access Private
 */
router.get('/sessions', authenticateToken, chatController.getSessions);

/**
 * @route POST /api/v1/chat/sessions
 * @desc 创建或获取聊天会话
 * @access Private
 */
router.post('/sessions', authenticateToken, chatController.createOrGetSession);

/**
 * @route GET /api/v1/chat/sessions/:sessionId/messages
 * @desc 获取聊天会话的消息历史
 * @access Private
 */
router.get('/sessions/:sessionId/messages', authenticateToken, chatController.getMessages);

/**
 * @route PUT /api/v1/chat/sessions/:sessionId/read
 * @desc 标记消息为已读
 * @access Private
 */
router.put('/sessions/:sessionId/read', authenticateToken, chatController.markAsRead);

/**
 * @route GET /api/v1/chat/notifications
 * @desc 获取系统通知
 * @access Private
 */
router.get('/notifications', authenticateToken, chatController.getNotifications);

/**
 * @route PUT /api/v1/chat/notifications/:id/read
 * @desc 标记通知为已读
 * @access Private
 */
router.put('/notifications/:id/read', authenticateToken, chatController.markNotificationAsRead);

export default router;
