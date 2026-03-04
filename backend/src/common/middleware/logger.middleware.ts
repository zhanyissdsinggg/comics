import { Request, Response, NextFunction } from "express";
import { logger } from "../logger/winston.init";

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const requestId = req.requestId || "";
    const status = res.statusCode;
    const message = `${req.method} ${req.originalUrl} ${status} ${duration}ms ${requestId}`.trim();
    if (status >= 500) {
      logger.error(message);
    } else if (status >= 400) {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  });
  next();
}
