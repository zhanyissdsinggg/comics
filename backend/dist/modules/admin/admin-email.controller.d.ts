import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EmailService } from "../email/email.service";
export declare class AdminEmailController {
    private readonly prisma;
    private readonly emailService;
    constructor(prisma: PrismaService, emailService: EmailService);
    getConfig(req: Request, res: Response): Promise<{
        error: string;
    } | {
        config: {
            resendApiKey: string;
            sendgridApiKey: string;
            smsWebhookUrl: string;
        };
    }>;
    save(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        config: import("@prisma/client/runtime/library").JsonValue;
    }>;
    test(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
    }>;
}
