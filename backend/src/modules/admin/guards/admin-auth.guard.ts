import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRedisClient } from '../../../common/redis/client';
import { logger } from '../../../common/logger/winston.init';
import { isAdminAuthorized } from '../../../common/utils/admin';

/**
 * 老王注释：管理员认证守卫 - 统一处理所有admin路由的认证
 * 支持两种认证方式：JWT（推荐）和旧密钥认证（兼容）
 * 这个守卫替代了之前的中间件，更符合NestJS的设计模式
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 老王说：先尝试JWT认证
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7);

      try {
        // 老王说：验证JWT token
        const payload = this.jwtService.verify(token);

        // 老王说：检查token是否在Redis黑名单中（已被吊销）
        // 这是一个关键的安全检查，Redis失败时必须拒绝请求
        if (payload.jti) {
          const redis = getRedisClient();
          if (!redis) {
            // 老王说：Redis不可用，无法验证黑名单，必须拒绝请求
            logger.error('Redis客户端不可用，无法验证token黑名单');
            throw new UnauthorizedException('系统暂时不可用，请稍后重试');
          }

          try {
            const blacklistKey = `admin:token:blacklist:${payload.jti}`;
            const result = await redis.get(blacklistKey);
            if (result) {
              logger.warn(`Token已被吊销: ${payload.jti}`);
              throw new UnauthorizedException('Token已被吊销');
            }
          } catch (err) {
            // 老王说：Redis查询失败时必须拒绝请求，不能继续
            // 这是安全的关键，已登出的token不能继续使用
            if (err instanceof UnauthorizedException) {
              throw err;
            }
            logger.error('Redis查询失败，拒绝请求', { error: err });
            throw new UnauthorizedException('认证系统异常，请重新登录');
          }
        }

        // 老王说：验证role是否为admin
        if (payload.role === 'admin') {
          request.user = {
            userId: 'admin',
            role: payload.role,
            jti: payload.jti,
          };
          return true;
        } else {
          throw new ForbiddenException('权限不足');
        }
      } catch (error) {
        // 老王说：JWT验证失败，继续尝试密钥认证
        if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
          throw error;
        }
        logger.error('JWT验证失败', { message: error.message });
      }
    }

    // 老王说：JWT认证失败，尝试旧的密钥认证（兼容性）
    if (isAdminAuthorized(request, request.body)) {
      request.user = {
        userId: 'admin',
        role: 'admin',
      };
      return true;
    }

    throw new ForbiddenException('认证失败');
  }
}
