import { AuthService } from "./auth.service";
import { Request, Response } from "express";
import { StatsService } from "../../common/services/stats.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EmailService } from "../email/email.service";
export declare class AuthController {
    private readonly authService;
    private readonly statsService;
    private readonly prisma;
    private readonly emailService;
    constructor(authService: AuthService, statsService: StatsService, prisma: PrismaService, emailService: EmailService);
    register(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        user: {
            id: string;
            email: string;
            emailVerified: boolean;
        };
    }>;
    login(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        requiresOtp: boolean;
        user?: undefined;
    } | {
        user: {
            id: string;
            email: string;
            emailVerified: boolean;
        };
        requiresOtp?: undefined;
    }>;
    logout(req: Request, res: Response): Promise<{
        ok: boolean;
    }>;
    me(req: Request, res: Response): Promise<{
        error: string;
    } | {
        user: {
            id: string;
            email: string;
            emailVerified: boolean;
        };
    }>;
    requestVerify(body: any, req: Request, res: Response): Promise<any>;
    requestOtp(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
    }>;
    verifyOtp(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        user: {
            id: string;
            email: string;
            emailVerified: boolean;
        };
    }>;
    verify(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
    }>;
    requestReset(body: any, req: Request, res: Response): Promise<any>;
    reset(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
    }>;
}
