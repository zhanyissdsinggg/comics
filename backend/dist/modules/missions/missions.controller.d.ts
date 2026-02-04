import { MissionsService } from "./missions.service";
import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class MissionsController {
    private readonly missionsService;
    private readonly prisma;
    constructor(missionsService: MissionsService, prisma: PrismaService);
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        daily: any;
        weekly: any;
    }>;
    report(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        daily: any;
        weekly: any;
    }>;
    claim(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
        reward: any;
        wallet: {
            id: string;
            userId: string;
            paidPts: number;
            bonusPts: number;
            plan: string;
        };
        daily: any;
        weekly: any;
    }>;
}
