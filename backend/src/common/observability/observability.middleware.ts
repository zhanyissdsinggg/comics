import { NextFunction, Request, Response } from "express";
import { ObservabilityService } from "./observability.service";

export function createObservabilityMiddleware(observability: ObservabilityService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();

    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      observability.recordRequest({
        method: req.method,
        path: req.route?.path || req.path || req.originalUrl || "/",
        statusCode: res.statusCode,
        durationMs,
        requestId: req.requestId || "",
      });
    });

    next();
  };
}

