import { NextFunction, Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    userEmail?: string;
  }
}

export function createSessionMiddleware(prisma: PrismaService) {
  return async function sessionMiddleware(req: Request, _res: Response, next: NextFunction) {
    const token = req.cookies?.mn_session;
    if (!token) {
      next();
      return;
    }
    try {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });
      if (session && !session.user?.isBlocked) {
        req.userId = session.userId;
        req.userEmail = session.user?.email || "";
      }
    } catch {
      // ignore session errors
    }
    next();
  };
}
