import { Request, Response, NextFunction } from "express";
declare module "express-serve-static-core" {
    interface Request {
        requestId?: string;
    }
}
export declare function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void;
