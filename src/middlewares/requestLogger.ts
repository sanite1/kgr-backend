import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

const isProduction = process.env.NODE_ENV === "production";
const SLOW_MS = 1000;

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.headers["x-forwarded-for"],
      userAgent: req.headers["user-agent"],
    };
    if (res.statusCode >= 400)
      logger.warn("Request completed with error", logData);
    // in production a line per healthy request is pure cost; keep only
    // the slow ones, which are the ones worth reading
    else if (!isProduction || duration > SLOW_MS)
      logger.info("Request completed", logData);
  });
  next();
};
