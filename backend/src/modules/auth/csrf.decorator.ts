import { UseGuards, applyDecorators } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

/**
 * 老王说：CSRF保护装饰器
 * 使用方式：@ProtectCsrf() 在需要保护的路由上
 * 这个装饰器会自动验证CSRF token
 */
export function ProtectCsrf() {
  return applyDecorators(UseGuards(CsrfGuard));
}
