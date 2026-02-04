import { PrismaService } from "../../common/prisma/prisma.service";
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private applyTtfAcceleration;
    private buildPayload;
    list(userId: string): Promise<{
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
    markRead(userId: string, notificationIds: string[]): Promise<{
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
}
