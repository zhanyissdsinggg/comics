import { PaymentsService } from "./payments.service";
import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { StatsService } from "../../common/services/stats.service";
export declare class PaymentsController {
    private readonly paymentsService;
    private readonly prisma;
    private readonly statsService;
    constructor(paymentsService: PaymentsService, prisma: PrismaService, statsService: StatsService);
    private logAudit;
    private verifyWebhookSignature;
    create(body: any, req: Request, res: Response): Promise<any>;
    confirm(body: any, req: Request, res: Response): Promise<any>;
    refund(body: any, req: Request, res: Response): Promise<any>;
    webhook(body: any, req: Request, res: Response): Promise<any>;
}
