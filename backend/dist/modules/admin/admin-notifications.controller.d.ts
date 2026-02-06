import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class AdminNotificationsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        notifications: {
            id: string;
            createdAt: Date;
            userId: string;
            message: string;
            title: string;
            type: string;
            seriesId: string | null;
            episodeId: string | null;
            read: boolean;
        }[];
    }>;
    create(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
        count: number;
        notification?: undefined;
    } | {
        notification: {
            id: string;
            createdAt: Date;
            userId: string;
            message: string;
            title: string;
            type: string;
            seriesId: string | null;
            episodeId: string | null;
            read: boolean;
        };
        ok?: undefined;
        count?: undefined;
    }>;
}
