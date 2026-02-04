import { NotificationsService } from "./notifications.service";
import { Request } from "express";
import { Response } from "express";
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    list(adultParam: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        notifications: {
            id: string;
            userId: string;
            createdAt: Date;
            type: string;
            title: string;
            message: string;
            seriesId: string | null;
            episodeId: string | null;
            read: boolean;
        }[];
    }>;
    markRead(body: any, req: Request, res: Response): {
        error: string;
    } | {
        notifications: Promise<{
            id: string;
            userId: string;
            createdAt: Date;
            type: string;
            title: string;
            message: string;
            seriesId: string | null;
            episodeId: string | null;
            read: boolean;
        }[]>;
    };
}
