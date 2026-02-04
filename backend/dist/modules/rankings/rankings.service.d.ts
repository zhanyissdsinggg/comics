import { PrismaService } from "../../common/prisma/prisma.service";
export declare class RankingsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(type: string, adult: boolean): Promise<{
        id: string;
        type: string;
        status: string;
        title: string;
        rating: number;
        adult: boolean;
        genres: string[];
        coverTone: string;
        coverUrl: string;
        badge: string;
        badges: string[];
        ratingCount: number;
        description: string;
        episodePrice: number;
        ttfEnabled: boolean;
        ttfIntervalHours: number;
        latestEpisodeId: string;
    }[]>;
}
