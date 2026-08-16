import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function createError(message: string, statusCode = 500, code?: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found`, success: false });
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? "Internal server error";

  if (statusCode >= 500) {
    logger.error({ err, req: { method: req.method, url: req.url } }, "Unhandled error");
  }

  res.status(statusCode).json({
    message,
    code: err.code,
    success: false,
  });
}
