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
            currency: string;
            userId: string;
            status: string;
            packageId: string;
            amount: number;
            paidAt: Date | null;
        };
        wallet: {
            id: string;
            paidPts: number;
            bonusPts: number;
            plan: string;
            userId: string;
        };
    }>;
    adjust(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        wallet: {
            id: string;
            paidPts: number;
            bonusPts: number;
            plan: string;
            userId: string;
        };
    }>;
}
