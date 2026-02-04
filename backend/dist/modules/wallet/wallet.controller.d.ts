import { WalletService } from "./wallet.service";
import { Request, Response } from "express";
import { StatsService } from "../../common/services/stats.service";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class WalletController {
    private readonly walletService;
    private readonly statsService;
    private readonly prisma;
    constructor(walletService: WalletService, statsService: StatsService, prisma: PrismaService);
    getWallet(req: Request, res: Response): Promise<{
        error: string;
    } | {
        wallet: any;
    }>;
    topup(body: any, req: Request, res: Response): Promise<any>;
}
