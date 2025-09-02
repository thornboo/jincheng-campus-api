import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateRequest } from '../middleware/validateRequest';
import { authSchemas } from '../schemas/authSchemas';

const router = Router();
const authController = new AuthController();

/**
 * @route POST /api/v1/auth/register
 * @desc 用户注册
 * @access Public
 */
router.post('/register', 
  validateRequest(authSchemas.register),
  authController.register
);

/**
 * @route POST /api/v1/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post('/login',
  validateRequest(authSchemas.login),
  authController.login
);

/**
 * @route POST /api/v1/auth/logout
 * @desc 用户登出
 * @access Private
 */
router.post('/logout', authController.logout);

/**
 * @route POST /api/v1/auth/refresh
 * @desc 刷新令牌
 * @access Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc 忘记密码
 * @access Public
 */
router.post('/forgot-password',
  validateRequest(authSchemas.forgotPassword),
  authController.forgotPassword
);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc 重置密码
 * @access Public
 */
router.post('/reset-password',
  validateRequest(authSchemas.resetPassword),
  authController.resetPassword
);

export default router;
