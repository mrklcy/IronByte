import type { NextFunction, Request, Response } from "express";
import type { Permission, RoleName } from "../constants/roles.js";
import { AppError } from "../exceptions/app-error.js";

export function requireRole(...roles: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Authentication required.", 401, "AUTH_REQUIRED"));
    if (!roles.some((role) => req.user?.roles.includes(role))) {
      return next(new AppError("Insufficient role.", 403, "FORBIDDEN"));
    }
    next();
  };
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Authentication required.", 401, "AUTH_REQUIRED"));
    if (!permissions.every((permission) => req.user?.permissions.includes(permission))) {
      return next(new AppError("Insufficient permission.", 403, "FORBIDDEN"));
    }
    next();
  };
}
