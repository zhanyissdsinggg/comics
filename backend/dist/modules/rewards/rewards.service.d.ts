import { PrismaService } from "../../common/prisma/prisma.service";
export declare class RewardsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private getTodayKey;
    getState(userId: string): Promise<{
        id: string;
        userId: string;
        lastCheckInDate: string;
        streakCount: number;
        makeUpUsedToday: boolean;
    }>;
    checkIn(userId: string): Promise<{
        ok: boolean;
        error: string;
        state: {
            id: string;
            userId: string;
            lastCheckInDate: string;
            streakCount: number;
            makeUpUsedToday: boolean;
        };
    } | {
        ok: boolean;
        state: {
            id: string;
            userId: string;
            lastCheckInDate: string;
            streakCount: number;
            makeUpUsedToday: boolean;
        };
        error?: undefined;
    }>;
    makeUp(userId: string): Promise<{
        ok: boolean;
        error: string;
        state?: undefined;
    } | {
        ok: boolean;
        state: {
            id: string;
            userId: string;
            lastCheckInDate: string;
            streakCount: number;
            makeUpUsedToday: boolean;
        };
        error?: undefined;
    }>;
}
