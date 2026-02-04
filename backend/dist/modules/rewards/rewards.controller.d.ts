import { RewardsService } from "./rewards.service";
import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class RewardsController {
    private readonly rewardsService;
    private readonly prisma;
    constructor(rewardsService: RewardsService, prisma: PrismaService);
    getState(req: Request, res: Response): Promise<{
        error: string;
    } | {
        rewardPts: number;
        id: string;
        userId: string;
        lastCheckInDate: string;
        streakCount: number;
        makeUpUsedToday: boolean;
    }>;
    checkIn(req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
        rewardPts: number;
        wallet: {
            id: string;
            userId: string;
            paidPts: number;
            bonusPts: number;
            plan: string;
        };
        state: {
            id: string;
            userId: string;
            lastCheckInDate: string;
            streakCount: number;
            makeUpUsedToday: boolean;
        };
    }>;
    makeUp(_body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
        wallet: {
            id: string;
            userId: string;
            paidPts: number;
            bonusPts: number;
            plan: string;
        };
        state: {
            id: string;
            userId: string;
            lastCheckInDate: string;
            streakCount: number;
            makeUpUsedToday: boolean;
        };
    }>;
}
