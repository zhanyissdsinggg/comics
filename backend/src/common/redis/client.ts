import Redis from "ioredis";

let client: Redis | null = null;
let initFailed = false;

export function getRedisClient() {
  if (initFailed) {
    return null;
  }
  if (client) {
    return client;
  }
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }
  try {
    client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    return client;
  } catch (err) {
    initFailed = true;
    console.warn("[redis] init failed", err);
    return null;
  }
}
