import { PrismaService } from "../prisma/prisma.service";
export declare class StatsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    recordDailyActive(userId: string): Promise<void>;
    recordRegistration(userId: string): Promise<void>;
    recordComicView(userId: string | null): Promise<void>;
    recordSeriesView(userId: string | null, seriesId: string): Promise<void>;
    recordPaidOrder(): Promise<void>;
    getDailyStats(from?: string | null, to?: string | null): Promise<{
        date: string;
        views: number;
        registrations: number;
        dau: number;
        paidOrders: number;
    }[]>;
    getTopSeries(from?: string | null, to?: string | null, type?: string, limit?: number): Promise<any[]>;
}
