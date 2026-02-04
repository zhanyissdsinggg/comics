import { Request, Response } from "express";
import { StatsService } from "../../common/services/stats.service";
export declare class AdminRankingsController {
    private readonly statsService;
    constructor(statsService: StatsService);
    list(range: string, type: string, limit: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        range: string;
        from: string;
        to: string;
        list: any[];
    }>;
}
