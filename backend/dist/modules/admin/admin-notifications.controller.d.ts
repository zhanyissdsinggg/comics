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
            type: string;
            read: boolean;
            message: string;
            seriesId: string | null;
            title: string;
            episodeId: string | null;
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
            type: string;
            read: boolean;
            message: string;
            seriesId: string | null;
            title: string;
            episodeId: string | null;
        };
        ok?: undefined;
        count?: undefined;
    }>;
}
