import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class AdminCommentsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        comments: {
            id: string;
            seriesId: string;
            userId: string;
            author: string;
            text: string;
            hidden: boolean;
            createdAt: Date;
        }[];
    }>;
    hide(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        comment: {
            id: string;
            createdAt: Date;
            userId: string;
            seriesId: string;
            text: string;
            hidden: boolean;
        };
    }>;
    recalc(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        rating: number;
        count: number;
    }>;
}
