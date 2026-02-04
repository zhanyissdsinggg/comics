import { Request, Response } from "express";
import { StatsService } from "../../common/services/stats.service";
export declare class AdminStatsController {
    private readonly statsService;
    constructor(statsService: StatsService);
    list(from: string, to: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        stats: {
            date: string;
            views: number;
            registrations: number;
            dau: number;
            paidOrders: number;
        }[];
        summary: {
            totalViews: number;
            totalRegistrations: number;
            avgDau: number;
            totalPaidOrders: number;
        };
    }>;
}
