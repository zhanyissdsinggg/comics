import { getRedisClient } from "../../../common/redis/client";
import { logger } from "../../../common/logger/winston.init";

const IN_MEMORY_REVOKED_TOKENS = new Map<string, number>();

function getBlacklistKey(jti: string): string {
  return `admin:token:blacklist:${jti}`;
}

function cleanupExpired(now = Date.now()): void {
  for (const [jti, expiresAt] of IN_MEMORY_REVOKED_TOKENS.entries()) {
    if (expiresAt <= now) {
      IN_MEMORY_REVOKED_TOKENS.delete(jti);
    }
  }
}

export function resetAdminTokenRevocationStore(): void {
  IN_MEMORY_REVOKED_TOKENS.clear();
}

export async function revokeAdminTokenJti(
  jti: string | undefined,
  ttlSeconds: number,
  label: string,
): Promise<boolean> {
  const normalizedJti = String(jti || "").trim();
  if (!normalizedJti) {
    return false;
  }

  const expiresAt = Date.now() + Math.max(1, ttlSeconds) * 1000;
  cleanupExpired();
  IN_MEMORY_REVOKED_TOKENS.set(normalizedJti, expiresAt);

  const redis = getRedisClient();
  if (!redis) {
    logger.warn(`[admin-auth] redis unavailable, using in-memory revocation for ${label}`);
    return true;
  }

  try {
    await redis.setex(getBlacklistKey(normalizedJti), Math.max(1, ttlSeconds), "1");
    return true;
  } catch (error) {
    logger.warn(`[admin-auth] redis revocation write failed for ${label}`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}

export async function isAdminTokenJtiRevoked(jti: string | undefined, label: string): Promise<boolean> {
  const normalizedJti = String(jti || "").trim();
  if (!normalizedJti) {
    return false;
  }

  cleanupExpired();
  const inMemoryExpiry = IN_MEMORY_REVOKED_TOKENS.get(normalizedJti);
  if (typeof inMemoryExpiry === "number" && inMemoryExpiry > Date.now()) {
    return true;
  }

  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    const result = await redis.get(getBlacklistKey(normalizedJti));
    return Boolean(result);
  } catch (error) {
    logger.warn(`[admin-auth] redis revocation lookup failed for ${label}`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
