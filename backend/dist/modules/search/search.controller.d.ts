import { SearchService } from "./search.service";
import { Request } from "express";
import { Response } from "express";
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    search(q: string, adultParam: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        results: {
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
        }[];
    }>;
    keywords(adultParam: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        keywords: string[];
    }>;
    suggest(q: string, adultParam: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        suggestions: string[];
    }>;
    hot(adultParam: string, windowParam: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        keywords: string[];
    }>;
    log(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
    }>;
}
