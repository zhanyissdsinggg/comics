import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 老王说：为每个请求添加Sentry上下文，用于错误追踪
    Sentry.captureMessage(`${req.method} ${req.path}`, 'info');

    res.on('finish', () => {
      // 老王说：记录响应状态码，便于后续分析
      if (res.statusCode >= 500) {
        Sentry.captureMessage(`Server Error: ${res.statusCode} ${req.method} ${req.path}`, 'error');
      }
    });

    next();
  }
}
