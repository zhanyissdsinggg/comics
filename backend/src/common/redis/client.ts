import Redis from "ioredis";
import { getRedisConfiguredUrl } from "../config/app-config";
import { logger } from "../logger/winston.init";

let client: Redis | null = null;
let initFailed = false;
let connectAttempted = false;

function connectClient(instance: Redis): void {
  if (connectAttempted) {
    return;
  }

  connectAttempted = true;
  void instance.connect().catch((error: unknown) => {
    logger.warn("[redis] connection failed, continuing without Redis", {
      message: error instanceof Error ? error.message : String(error),
    });
  });
}

export function isRedisConfigured(): boolean {
  return Boolean(getRedisConfiguredUrl());
}

export function getRedisClient(): Redis | null {
  if (initFailed) {
    return null;
  }

  if (client) {
    connectClient(client);
    return client;
  }

  const url = getRedisConfiguredUrl();
  if (!url) {
    return null;
  }

  try {
    client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on("error", (error: unknown) => {
      logger.warn("[redis] client error", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
    connectClient(client);
    return client;
  } catch (error) {
    initFailed = true;
    logger.warn("[redis] initialization failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function getRedisStatus(): string {
  const redis = getRedisClient();
  if (!redis) {
    return isRedisConfigured() ? "degraded" : "disabled";
  }
  return redis.status || "connecting";
}

export async function disconnectRedisClient(): Promise<void> {
  if (!client) {
    return;
  }

  const current = client;
  client = null;
  connectAttempted = false;
  await current.quit().catch(() => undefined);
}
