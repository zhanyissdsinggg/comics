import { Request, Response } from "express";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class AdminEmailJobsController {
    private readonly emailService;
    private readonly prisma;
    constructor(emailService: EmailService, prisma: PrismaService);
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        jobs: {
            id: any;
            status: any;
            provider: any;
            to: any;
            subject: any;
            priority: any;
            error: any;
            retries: any;
            lastAttemptAt: any;
        }[];
    }>;
    failed(req: Request, res: Response): Promise<{
        error: string;
    } | {
        jobs: {
            id: any;
            status: any;
            provider: any;
            to: any;
            subject: any;
            priority: any;
            error: any;
            retries: any;
            lastAttemptAt: any;
        }[];
    }>;
    retry(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
    }>;
}
