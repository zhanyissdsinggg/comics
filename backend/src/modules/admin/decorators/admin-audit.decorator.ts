import { SetMetadata, UseInterceptors } from '@nestjs/common';
import { AdminAuditInterceptor } from '../interceptors/admin-audit.interceptor';

/**
 * 老王注释：审计日志装饰器 - 自动记录管理员操作
 * 使用方式：@AdminAudit('create', 'series')
 * 这个装饰器会自动记录操作类型、资源类型、操作者、操作时间等信息
 */
export const AdminAudit = (action: string, resource: string) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    // 老王说：设置元数据
    SetMetadata('audit', { action, resource })(target, propertyKey, descriptor);

    // 老王说：使用拦截器处理审计日志
    UseInterceptors(AdminAuditInterceptor)(target, propertyKey, descriptor);

    return descriptor;
  };
};
