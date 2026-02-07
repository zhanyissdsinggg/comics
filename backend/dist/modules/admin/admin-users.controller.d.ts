import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class AdminUsersController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        users: ({
            wallet: {
                id: string;
                paidPts: number;
                bonusPts: number;
                plan: string;
                userId: string;
            };
        } & {
            id: string;
            createdAt: Date;
            email: string;
            password: string;
            isBlocked: boolean;
            emailVerified: boolean;
            emailVerifiedAt: Date | null;
        })[];
    }>;
    tickets(req: Request, res: Response): Promise<{
        error: string;
    } | {
        tickets: {
            id: string;
            createdAt: Date;
            userId: string;
            subject: string;
            message: string;
            status: string;
        }[];
    }>;
    block(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        user: {
            id: string;
            createdAt: Date;
            email: string;
            password: string;
            isBlocked: boolean;
            emailVerified: boolean;
            emailVerifiedAt: Date | null;
        };
    }>;
}
