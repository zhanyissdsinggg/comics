import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class AdminBillingController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listTopups(req: Request, res: Response): Promise<{
        error: string;
    } | {
        packages: any;
    }>;
    createTopup(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        package: {
            id: string;
            createdAt: Date;
            currency: string;
            paidPts: number;
            bonusPts: number;
            active: boolean;
            tags: string[];
            updatedAt: Date;
            label: string;
            price: number;
        };
    }>;
    updateTopup(id: string, body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        package: {
            id: string;
            createdAt: Date;
            currency: string;
            paidPts: number;
            bonusPts: number;
            active: boolean;
            tags: string[];
            updatedAt: Date;
            label: string;
            price: number;
        };
    }>;
    listPlans(req: Request, res: Response): Promise<{
        error: string;
    } | {
        plans: any[];
    }>;
    createPlan(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        plan: {
            id: string;
            createdAt: Date;
            currency: string;
            active: boolean;
            updatedAt: Date;
            label: string;
            price: number;
            discountPct: number;
            dailyFreeUnlocks: number;
            ttfMultiplier: number;
            voucherPts: number;
        };
    }>;
    updatePlan(id: string, body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        plan: {
            id: string;
            createdAt: Date;
            currency: string;
            active: boolean;
            updatedAt: Date;
            label: string;
            price: number;
            discountPct: number;
            dailyFreeUnlocks: number;
            ttfMultiplier: number;
            voucherPts: number;
        };
    }>;
}
