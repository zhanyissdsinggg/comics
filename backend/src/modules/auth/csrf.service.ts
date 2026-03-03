import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * 老王说：CSRF保护服务，防止跨站请求伪造
 * 这个SB服务生成和验证CSRF token
 */
@Injectable()
export class CsrfService {
  private readonly tokenStore = new Map<string, { token: string; expiresAt: number }>();
  private readonly TOKEN_EXPIRY_MS = 1 * 60 * 60 * 1000; // 1小时

  /**
   * 老王说：生成CSRF token
   * @param sessionId 会话ID
   * @returns CSRF token
   */
  generateToken(sessionId: string): string {
    // 清理过期的token
    this.cleanupExpiredTokens();

    // 生成新的token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.TOKEN_EXPIRY_MS;

    this.tokenStore.set(sessionId, { token, expiresAt });

    return token;
  }

  /**
   * 老王说：验证CSRF token
   * @param sessionId 会话ID
   * @param token 要验证的token
   * @returns 是否有效
   */
  verifyToken(sessionId: string, token: string): boolean {
    const stored = this.tokenStore.get(sessionId);

    if (!stored) {
      console.warn(`[CsrfService] CSRF token不存在: ${sessionId}`);
      return false;
    }

    // 检查是否过期
    if (Date.now() > stored.expiresAt) {
      this.tokenStore.delete(sessionId);
      console.warn(`[CsrfService] CSRF token已过期: ${sessionId}`);
      return false;
    }

    // 使用恒定时间比较防止时序攻击
    const isValid = crypto.timingSafeEqual(
      Buffer.from(stored.token),
      Buffer.from(token)
    );

    if (isValid) {
      // 验证成功后删除token，防止重复使用
      this.tokenStore.delete(sessionId);
    }

    return isValid;
  }

  /**
   * 老王说：清理过期的token
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, data] of this.tokenStore.entries()) {
      if (now > data.expiresAt) {
        this.tokenStore.delete(sessionId);
      }
    }
  }
}
