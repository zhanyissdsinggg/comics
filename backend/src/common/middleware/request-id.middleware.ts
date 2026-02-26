import { Request, Response, NextFunction } from "express";
import { createRequestId } from "../utils/request-id";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const existing = req.headers["x-request-id"];
  const requestId = Array.isArray(existing) ? existing[0] : existing || createRequestId();
  req.requestId = String(requestId);
  res.setHeader("x-request-id", req.requestId);
  next();
}
