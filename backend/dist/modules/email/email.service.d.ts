import { PrismaService } from "../../common/prisma/prisma.service";
type SendResult = {
    ok: boolean;
    status?: number;
    error?: string;
};
export declare class EmailService {
    private readonly prisma;
    private cache;
    private retryTimer;
    constructor(prisma: PrismaService);
    startRetryLoop(): void;
    private loadConfig;
    private sendViaWebhook;
    private sendViaResend;
    private sendViaSendgrid;
    private sendViaSmsWebhook;
    private attemptSend;
    private attemptSendWithPriority;
    private notifyAdminFailure;
    sendEmail(to: string, subject: string, html: string, text: string, options?: {
        priority?: string;
    }): Promise<{
        ok: boolean;
    }>;
    retryJobById(jobId: string): Promise<{
        ok: boolean;
        error: string;
    } | {
        ok: boolean;
        error?: undefined;
    }>;
    retryFailedJobs(): Promise<void>;
    sendVerifyEmail(email: string, token: string): Promise<{
        ok: boolean;
    }>;
    sendResetEmail(email: string, token: string): Promise<{
        ok: boolean;
    }>;
    sendSmsOtp(phone: string, code: string): Promise<SendResult>;
}
export {};
