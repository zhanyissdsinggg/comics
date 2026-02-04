import { PrismaService } from "../../common/prisma/prisma.service";
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    register(email: string, password: string): Promise<{
        id: string;
        email: string;
        password: string;
        isBlocked: boolean;
        emailVerified: boolean;
        emailVerifiedAt: Date | null;
        createdAt: Date;
    }>;
    login(email: string, password: string): Promise<{
        id: string;
        email: string;
        password: string;
        isBlocked: boolean;
        emailVerified: boolean;
        emailVerifiedAt: Date | null;
        createdAt: Date;
    }>;
    createSession(userId: string): Promise<`${string}-${string}-${string}-${string}-${string}`>;
    getSessionUserId(token: string | undefined): Promise<string>;
    deleteSession(token: string | undefined): Promise<void>;
    createAuthToken(userId: string, type: string, ttlMinutes?: number, tokenOverride?: string): Promise<string>;
    consumeAuthToken(token: string, type: string): Promise<{
        id: string;
        createdAt: Date;
        token: string;
        userId: string;
        type: string;
        expiresAt: Date;
        usedAt: Date | null;
    }>;
    recordOtpFailure(email: string, limit?: number, windowMinutes?: number): Promise<{
        ok: boolean;
        remaining: number;
        retryAfterSec?: undefined;
    } | {
        ok: boolean;
        remaining: number;
        retryAfterSec: number;
    }>;
    clearOtpFailures(email: string): Promise<void>;
    markEmailVerified(userId: string): Promise<void>;
    updatePassword(userId: string, password: string): Promise<void>;
}
