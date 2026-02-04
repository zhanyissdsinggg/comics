import { PrismaService } from "../../common/prisma/prisma.service";
export declare class EntitlementsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private applyTtfAcceleration;
    getEntitlement(userId: string, seriesId: string): Promise<{
        seriesId: string;
        unlockedEpisodeIds: string[];
    }>;
    unlockWithWallet(userId: string, seriesId: string, episodeId: string): Promise<{
        ok: boolean;
        entitlement: {
            seriesId: string;
            unlockedEpisodeIds: string[];
        };
        wallet: any;
        status?: undefined;
        error?: undefined;
        shortfallPts?: undefined;
    } | {
        ok: boolean;
        status: number;
        error: string;
        entitlement?: undefined;
        wallet?: undefined;
        shortfallPts?: undefined;
    } | {
        ok: boolean;
        status: number;
        error: string;
        shortfallPts: number;
        entitlement?: undefined;
        wallet?: undefined;
    }>;
    unlockWithTtf(userId: string, seriesId: string, episodeId: string): Promise<{
        ok: boolean;
        entitlement: {
            seriesId: string;
            unlockedEpisodeIds: string[];
        };
        status?: undefined;
        error?: undefined;
        wallet?: undefined;
    } | {
        ok: boolean;
        status: number;
        error: string;
        entitlement?: undefined;
        wallet?: undefined;
    } | {
        ok: boolean;
        entitlement: {
            unlockedEpisodeIds: string[];
            seriesId: string;
        };
        wallet: any;
        status?: undefined;
        error?: undefined;
    }>;
    unlockPack(userId: string, seriesId: string, episodeIds: string[], offerId: string): Promise<{
        ok: boolean;
        status: number;
        error: string;
        entitlement?: undefined;
        wallet?: undefined;
        shortfallPts?: undefined;
    } | {
        ok: boolean;
        entitlement: {
            seriesId: string;
            unlockedEpisodeIds: string[];
        };
        wallet: any;
        status?: undefined;
        error?: undefined;
        shortfallPts?: undefined;
    } | {
        ok: boolean;
        status: number;
        error: string;
        shortfallPts: number;
        entitlement?: undefined;
        wallet?: undefined;
    }>;
}
