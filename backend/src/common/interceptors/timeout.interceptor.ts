import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, timeout } from 'rxjs';

/**
 * 老王说：请求超时拦截器
 * 防止请求无限等待，保护服务器资源
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  // 老王说：不同路由的超时时间配置
  private readonly timeoutConfig = {
    // 上传文件超时时间较长
    '/api/admin/upload': 30000,
    '/api/upload': 30000,
    // 支付相关操作超时时间较长
    '/api/payments': 15000,
    '/api/orders': 15000,
    // 默认超时时间
    default: 8000,
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const path = request.path;

    // 老王说：根据路由选择合适的超时时间
    let timeoutMs = this.timeoutConfig.default;
    for (const [route, ms] of Object.entries(this.timeoutConfig)) {
      if (route !== 'default' && path.startsWith(route)) {
        timeoutMs = ms;
        break;
      }
    }

    return next.handle().pipe(
      timeout(timeoutMs),
    );
  }
}
