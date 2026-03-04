import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logger } from './winston.init';

@Injectable()
export class WinstonMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      };

      // 老王说：根据状态码决定日志级别，别tm全部记成info
      if (res.statusCode >= 500) {
        logger.error('Server Error', logData);
      } else if (res.statusCode >= 400) {
        logger.warn('Client Error', logData);
      } else {
        logger.info('Request completed', logData);
      }
    });

    next();
  }
}
