import { PrismaService } from "../../common/prisma/prisma.service";
export declare class SearchService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private getTodayKey;
    private buildDateRange;
    private buildSuggestions;
    search(query: string, adult: boolean): Promise<{
        id: string;
        title: string;
        type: string;
        adult: boolean;
        genres: string[];
        coverTone: string;
        coverUrl: string;
        badge: string;
        badges: string[];
        status: string;
        rating: number;
        ratingCount: number;
        description: string;
        episodePrice: number;
        ttfEnabled: boolean;
        ttfIntervalHours: number;
        latestEpisodeId: string;
    }[]>;
    keywords(adult: boolean): Promise<string[]>;
    suggest(query: string, adult: boolean): Promise<string[]>;
    hot(adult: boolean, windowParam?: string): Promise<string[]>;
    log(_userId: string, query: string): Promise<void>;
}
