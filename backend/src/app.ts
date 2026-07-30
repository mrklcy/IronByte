import cookieParser from "cookie-parser";
import express, { type RequestHandler } from "express";
import { createRequire } from "node:module";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";
import { applySecurity } from "./middleware/security.js";
import { logger } from "./logger/logger.js";

const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http") as (options: { logger: typeof logger }) => RequestHandler;

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(pinoHttp({ logger }));
  applySecurity(app);
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use("/api/v1", apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
