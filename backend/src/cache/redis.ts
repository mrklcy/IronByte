import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../logger/logger.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  lazyConnect: true,
});

redis.on("error", (error: Error) => logger.error({ error }, "Redis error"));

export async function connectRedis() {
  if (redis.status === "wait") {
    await redis.connect();
  }
}
