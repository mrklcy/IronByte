import { Queue, Worker } from "bullmq";
import { redis } from "../cache/redis.js";
import { logger } from "../logger/logger.js";

export const emailQueue = new Queue("email", { connection: redis });
export const achievementQueue = new Queue("achievement", { connection: redis });

export function registerWorkers() {
  new Worker(
    "email",
    async (job) => {
      logger.info({ jobId: job.id, name: job.name }, "Email job processed");
    },
    { connection: redis },
  );

  new Worker(
    "achievement",
    async (job) => {
      logger.info({ jobId: job.id, name: job.name }, "Achievement job processed");
    },
    { connection: redis },
  );
}
