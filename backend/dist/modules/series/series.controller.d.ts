import { SeriesService } from "./series.service";
import { Request } from "express";
import { Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class SeriesController {
    private readonly seriesService;
    private readonly prisma;
    constructor(seriesService: SeriesService, prisma: PrismaService);
    list(adultParam: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
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
        }[];
    }>;
    detail(id: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
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
