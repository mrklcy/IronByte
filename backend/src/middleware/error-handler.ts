import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../exceptions/app-error.js";
import { logger } from "../logger/logger.js";
import { fail } from "../utils/api-response.js";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404, "NOT_FOUND"));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn({ error, requestId: req.requestId }, "Database request failed");
    return fail(res, "Database request failed.", 400, [{ code: error.code, meta: error.meta }]);
  }

  if (error instanceof AppError) {
    logger.warn({ error, requestId: req.requestId }, error.message);
    return fail(res, error.message, error.statusCode, error.details);
  }

  logger.error({ error, requestId: req.requestId }, "Unhandled error");
  return fail(res, "Internal server error.", 500);
}
