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
            updatedAt: Date;
            paidPts: number;
            bonusPts: number;
            price: number;
            currency: string;
            active: boolean;
            label: string;
            tags: string[];
        };
    }>;
    updateTopup(id: string, body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        package: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            paidPts: number;
            bonusPts: number;
            price: number;
            currency: string;
            active: boolean;
            label: string;
            tags: string[];
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
            updatedAt: Date;
            price: number;
            currency: string;
            active: boolean;
            label: string;
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
            updatedAt: Date;
            price: number;
            currency: string;
            active: boolean;
            label: string;
            discountPct: number;
            dailyFreeUnlocks: number;
            ttfMultiplier: number;
            voucherPts: number;
        };
    }>;
}
