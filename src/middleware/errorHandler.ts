import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  statusCode?: number;
  status?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // 设置默认错误
  let statusCode = error.statusCode || 500;
  let message = error.message || '服务器内部错误';

  // Prisma 错误处理
  if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = '数据库操作错误';
  }

  // JWT 错误处理
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的令牌';
  }

  // 验证错误处理
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败';
  }

  console.error('Error:', err);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `路由 ${req.originalUrl} 不存在`
    }
  });
};
