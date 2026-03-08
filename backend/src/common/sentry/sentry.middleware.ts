import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";

@Injectable()
export class SentryMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Reduce Sentry noise: capture only server failures.
    res.on("finish", () => {
      if (res.statusCode >= 500) {
        Sentry.withScope((scope) => {
          scope.setLevel("error");
          scope.setTag("http.status_code", String(res.statusCode));
          scope.setContext("request", {
            method: req.method,
            path: req.originalUrl || req.path,
            requestId: req.headers["x-request-id"],
          });
          Sentry.captureMessage(`HTTP ${res.statusCode} ${req.method} ${req.path}`);
        });
      }
    });

    next();
  }
}
