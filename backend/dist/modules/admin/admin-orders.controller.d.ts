import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AdminLogService } from "../../common/services/admin-log.service";
export declare class AdminOrdersController {
    private readonly prisma;
    private readonly adminLogService;
    constructor(prisma: PrismaService, adminLogService: AdminLogService);
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        orders: any[];
    }>;
    refund(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
        order: {
            orderId: string;
            id: string;
            createdAt: Date;
            userId: string;
            packageId: string;
            amount: number;
            currency: string;
            status: string;
            paidAt: Date | null;
        };
        wallet: {
            id: string;
            userId: string;
            paidPts: number;
            bonusPts: number;
            plan: string;
        };
    }>;
    adjust(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        wallet: {
            id: string;
            userId: string;
            paidPts: number;
            bonusPts: number;
            plan: string;
        };
    }>;
}
