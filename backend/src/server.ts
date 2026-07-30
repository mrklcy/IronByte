import { createServer } from "node:http";
import { env } from "./config/env.js";
import { connectRedis, redis } from "./cache/redis.js";
import { prisma } from "./database/prisma.js";
import { logger } from "./logger/logger.js";
import { createApp } from "./app.js";

const server = createServer(createApp());

async function start() {
  await prisma.$connect();
  await connectRedis();

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "TrainHack API listening");
  });
}

function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down TrainHack API");
  server.close(async () => {
    await redis.quit();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start().catch(async (error) => {
  logger.error({ error }, "Failed to start API");
  await prisma.$disconnect();
  process.exit(1);
});
