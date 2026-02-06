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
                userId: string;
                paidPts: number;
                bonusPts: number;
                plan: string;
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
            status: string;
            message: string;
            subject: string;
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
