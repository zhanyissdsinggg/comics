type IdempotencyRecord = { status?: number; body?: any; createdAt: number };

const idempotencyByUser = new Map<string, Map<string, IdempotencyRecord>>();
const rateLimitByUser = new Map<string, Map<string, { count: number; resetAt: number }>>();
const IDEMPOTENCY_TTL_SEC = 24 * 60 * 60;

async function getRedis() {
  const { getRedisClient } = await import("../redis/client");
  const client = getRedisClient();
  if (!client) {
    return null;
  }
  try {
    if (client.status !== "ready") {
      await client.connect();
    }
    return client;
  } catch (err) {
    console.warn("[redis] connect failed", err);
    return null;
  }
}

export async function getIdempotencyRecord(prisma: any, userId: string, key: string) {
  if (!userId || !key) {
    return null;
  }
  const redis = await getRedis();
  if (redis) {
    const raw = await redis.get(`idem:${userId}:${key}`);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      return { status: parsed.status || 200, body: parsed.body };
    } catch (err) {
      return null;
    }
  }
  if (prisma?.idempotencyKey) {
    const record = await prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (!record) {
      return null;
    }
    return { status: record.status || undefined, body: record.body || undefined };
  }
  return idempotencyByUser.get(userId)?.get(key) || null;
}

export async function setIdempotencyRecord(prisma: any, userId: string, key: string, value: any) {
  if (!userId || !key) {
    return;
  }
  const redis = await getRedis();
  if (redis) {
    const payload = JSON.stringify({
      status: value?.status || 200,
      body: value?.body || null,
    });
    await redis.set(`idem:${userId}:${key}`, payload, "EX", IDEMPOTENCY_TTL_SEC);
    return;
  }
  if (prisma?.idempotencyKey) {
    await prisma.idempotencyKey.upsert({
      where: { userId_key: { userId, key } },
      update: { status: value?.status || 200, body: value?.body || null },
      create: {
        userId,
        key,
        status: value?.status || 200,
        body: value?.body || null,
      },
    });
    return;
  }
  if (!idempotencyByUser.has(userId)) {
    idempotencyByUser.set(userId, new Map());
  }
  idempotencyByUser.get(userId)!.set(key, { ...(value || {}), createdAt: Date.now() });
}

export async function checkRateLimit(
  prisma: any,
  userId: string,
  action: string,
  limit: number,
  windowSec: number
) {
  if (!userId || !action) {
    return { ok: false, retryAfterSec: windowSec };
  }
  const redis = await getRedis();
  if (redis) {
    const key = `rl:${userId}:${action}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSec);
    }
    if (count > limit) {
      const ttl = await redis.ttl(key);
      return { ok: false, retryAfterSec: Math.max(1, ttl) };
    }
    return { ok: true, retryAfterSec: 0 };
  }
  const now = new Date();
  if (prisma?.rateLimitCounter) {
    const record = await prisma.rateLimitCounter.findUnique({
      where: { userId_action: { userId, action } },
    });
    if (!record || now.getTime() > record.resetAt.getTime()) {
      const resetAt = new Date(now.getTime() + windowSec * 1000);
      await prisma.rateLimitCounter.upsert({
        where: { userId_action: { userId, action } },
        update: { count: 1, resetAt },
        create: { userId, action, count: 1, resetAt },
      });
      return { ok: true, retryAfterSec: 0 };
    }
    if (record.count >= limit) {
      const retryAfterSec = Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000);
      return { ok: false, retryAfterSec };
    }
    await prisma.rateLimitCounter.update({
      where: { userId_action: { userId, action } },
      data: { count: { increment: 1 } },
    });
    return { ok: true, retryAfterSec: 0 };
  }
  if (!rateLimitByUser.has(userId)) {
    rateLimitByUser.set(userId, new Map());
  }
  const nowMs = Date.now();
  const key = String(action);
  const map = rateLimitByUser.get(userId)!;
  const record = map.get(key) || {
    count: 0,
    resetAt: nowMs + windowSec * 1000,
  };
  if (nowMs > record.resetAt) {
    record.count = 0;
    record.resetAt = nowMs + windowSec * 1000;
  }
  if (record.count >= limit) {
    const retryAfterSec = Math.ceil((record.resetAt - nowMs) / 1000);
    map.set(key, record);
    return { ok: false, retryAfterSec };
  }
  record.count += 1;
  map.set(key, record);
  return { ok: true, retryAfterSec: 0 };
}

export async function checkRateLimitByIp(
  prisma: any,
  ip: string,
  action: string,
  limit: number,
  windowSec: number
) {
  const key = ip ? `ip:${ip}` : "ip:unknown";
  return checkRateLimit(prisma, key, action, limit, windowSec);
}
