import { PrismaService } from "../../common/prisma/prisma.service";
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private applyTtfAcceleration;
    private buildPayload;
    list(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        message: string;
        title: string;
        type: string;
        seriesId: string | null;
        episodeId: string | null;
        read: boolean;
    }[]>;
    markRead(userId: string, notificationIds: string[]): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        message: string;
        title: string;
        type: string;
        seriesId: string | null;
        episodeId: string | null;
        read: boolean;
    }[]>;
}
