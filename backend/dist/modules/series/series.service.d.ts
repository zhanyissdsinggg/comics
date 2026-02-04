import { PrismaService } from "../../common/prisma/prisma.service";
export declare class SeriesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private toSeriesView;
    private applyTtfAcceleration;
    list(adult: boolean | null): Promise<{
        id: any;
        title: any;
        type: any;
        adult: any;
        coverTone: any;
        coverUrl: any;
        badge: any;
        badges: any;
        latest: string;
        latestEpisodeId: any;
        genres: any;
        status: any;
        rating: any;
        ratingCount: any;
        description: any;
        pricing: {
            currency: string;
            episodePrice: any;
            discount: number;
        };
        ttf: {
            enabled: boolean;
            intervalHours: any;
        };
    }[]>;
    detail(seriesId: string, subscription?: any): Promise<{
        series: {
            id: any;
            title: any;
            type: any;
            adult: any;
            coverTone: any;
            coverUrl: any;
            badge: any;
            badges: any;
            latest: string;
            latestEpisodeId: any;
            genres: any;
            status: any;
            rating: any;
            ratingCount: any;
            description: any;
            pricing: {
                currency: string;
                episodePrice: any;
                discount: number;
            };
            ttf: {
                enabled: boolean;
                intervalHours: any;
            };
        };
        episodes: any[];
    }>;
}
