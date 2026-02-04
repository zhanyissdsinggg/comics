import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";

@Injectable()
export class AdminKeyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (isAdminAuthorized(req, req.body)) {
      next();
      return;
    }
    res.status(403).json({ error: "FORBIDDEN" });
  }
}
