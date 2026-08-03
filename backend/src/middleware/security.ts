import compression from "compression";
import cors from "cors";
import type { Express } from "express";
import helmet from "helmet";
import { env } from "../config/env.js";

export function applySecurity(app: Express) {
  const allowedOrigins = env.API_ORIGIN.split(",").map((origin) => origin.trim());
  const localDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || (env.NODE_ENV === "development" && localDevOrigin.test(origin))) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked origin: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(compression());
}
