import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class AdminMetricsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMetrics(_req: Request, _res: Response): Promise<{
        date: string;
        paidOrders: number;
        failedOrders: number;
        pendingOrders: number;
        retryPending: number;
        dau: number;
    }>;
}
