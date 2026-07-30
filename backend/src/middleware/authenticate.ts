import type { NextFunction, Request, Response } from "express";
import { AppError } from "../exceptions/app-error.js";
import { verifyAccessToken } from "../utils/tokens.js";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    return next(new AppError("Authentication required.", 401, "AUTH_REQUIRED"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
      sessionId: payload.sessionId,
    };
    next();
  } catch {
    next(new AppError("Invalid or expired access token.", 401, "INVALID_TOKEN"));
  }
}
