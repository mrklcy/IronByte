import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ["req.headers.authorization", "req.headers.cookie", "password", "passwordHash", "token"],
  base: {
    service: "trainhack-backend",
    environment: env.NODE_ENV,
  },
});
