import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfService } from './csrf.service';
import { logger } from '../../common/logger/winston.init';

/**
 * 老王说：CSRF保护守卫
 * 这个SB守卫会自动验证POST/PUT/DELETE请求的CSRF token
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private csrfService: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 老王说：只对POST、PUT、DELETE、PATCH请求进行CSRF验证
    const method = request.method.toUpperCase();
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return true;
    }

    // 老王说：从请求头或请求体中获取CSRF token
    const csrfToken = request.headers['x-csrf-token'] || request.body?.csrfToken;

    if (!csrfToken) {
      logger.warn(`CSRF token缺失: ${request.path}`);
      throw new ForbiddenException('CSRF token缺失');
    }

    // 老王说：从Cookie或Session中获取sessionId
    const sessionId = request.sessionID || request.headers['x-session-id'];

    if (!sessionId) {
      logger.warn(`Session ID缺失: ${request.path}`);
      throw new ForbiddenException('Session ID缺失');
    }

    // 老王说：验证CSRF token
    const isValid = this.csrfService.verifyToken(sessionId, csrfToken);

    if (!isValid) {
      logger.warn(`CSRF token验证失败: ${request.path}`);
      throw new ForbiddenException('CSRF token验证失败');
    }

    return true;
  }
}
