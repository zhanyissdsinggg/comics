import { RankingsService } from "./rankings.service";
import { Request } from "express";
import { Response } from "express";
export declare class RankingsController {
    private readonly rankingsService;
    constructor(rankingsService: RankingsService);
    list(type: string, adultParam: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        rankings: {
            id: string;
            status: string;
            rating: number;
            adult: boolean;
            title: string;
            type: string;
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
        }[];
    }>;
}
