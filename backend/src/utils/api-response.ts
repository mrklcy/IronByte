import type { Response } from "express";
import type { ApiFailure, ApiSuccess } from "../interfaces/api-response.js";

export function ok<TData, TMeta = unknown>(
  res: Response,
  message: string,
  data: TData,
  meta?: TMeta,
  status = 200,
) {
  const body: ApiSuccess<TData, TMeta> = { success: true, message, data, meta };
  return res.status(status).json(body);
}

export function fail(res: Response, message: string, status = 400, errors?: unknown[]) {
  const body: ApiFailure = { success: false, message, errors };
  return res.status(status).json(body);
}
