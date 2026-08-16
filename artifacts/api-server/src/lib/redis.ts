import Redis from "ioredis";
import { logger } from "./logger.js";

let redisClient: Redis | null = null;

export function getRedis(): Redis | null {
  return redisClient;
}

export function connectRedis(): void {
  const url = process.env["REDIS_URL"];
  if (!url) {
    logger.warn("REDIS_URL not set — running without cache");
    return;
  }
  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: false,
    });

    redisClient.on("connect", () => logger.info("Redis connected"));
    redisClient.on("error", (err: Error) => {
      logger.warn({ err }, "Redis error — disabling cache");
      redisClient = null;
    });
  } catch (err) {
    logger.warn({ err }, "Redis init failed — running without cache");
    redisClient = null;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
