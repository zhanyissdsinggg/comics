import { NextFunction, Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
declare module "express-serve-static-core" {
    interface Request {
        userId?: string;
        userEmail?: string;
    }
}
export declare function createSessionMiddleware(prisma: PrismaService): (req: Request, _res: Response, next: NextFunction) => Promise<void>;
