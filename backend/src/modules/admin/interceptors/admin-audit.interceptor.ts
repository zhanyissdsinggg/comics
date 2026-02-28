import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AdminLogService } from '../../../common/services/admin-log.service';

/**
 * 老王注释：审计日志拦截器 - 自动记录管理员操作
 * 这个拦截器会在方法执行前后记录操作信息
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private adminLogService: AdminLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const auditMetadata = this.reflector.get('audit', context.getHandler());

    if (!auditMetadata) {
      return next.handle();
    }

    const { action, resource } = auditMetadata;
    const user = request.user || { userId: 'unknown', role: 'unknown' };
    const resourceId = request.params?.id || 'unknown';

    return next.handle().pipe(
      tap(
        () => {
          // 老王说：操作成功，记录审计日志（静默，不影响主流程）
          this.adminLogService.log(
            action,
            resource,
            resourceId,
            {
              body: this.sanitizeBody(request.body),
              params: request.params,
              query: request.query,
              userId: user.userId,
            },
            request,
          ).catch(() => {
            // 日志失败不影响响应
          });
        },
        (error) => {
          // 老王说：操作失败，记录错误日志（静默，不影响主流程）
          this.adminLogService.log(
            `${action}_error`,
            resource,
            resourceId,
            {
              error: error.message,
              statusCode: error.status || 500,
              userId: user.userId,
            },
            request,
          ).catch(() => {
            // 日志失败不影响响应
          });
        },
      ),
    );
  }

  /**
   * 老王说：清理敏感信息，不记录密码等敏感数据
   */
  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey'];

    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}
