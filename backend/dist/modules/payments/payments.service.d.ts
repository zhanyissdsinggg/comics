import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class PaymentsService implements OnModuleInit, OnModuleDestroy {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private retryTimer;
    onModuleInit(): void;
    onModuleDestroy(): void;
    private buildNextRetryTime;
    enqueueRetry(userId: string, orderId: string, paymentId?: string, reason?: string): Promise<void>;
    processRetries(): Promise<void>;
    create(userId: string, packageId: string, provider?: string): Promise<{
        order: {
            id: string;
            createdAt: Date;
            userId: string;
            status: string;
            currency: string;
            packageId: string;
            amount: number;
            paidAt: Date | null;
        };
        payment: {
            paymentId: string;
            orderId: string;
            provider: string;
            status: string;
            createdAt: Date;
        };
    }>;
    confirm(userId: string, paymentId: string): Promise<{
        ok: boolean;
        error: string;
        order?: undefined;
        wallet?: undefined;
    } | {
        ok: boolean;
        order: {
            id: string;
            createdAt: Date;
            userId: string;
            status: string;
            currency: string;
            packageId: string;
            amount: number;
            paidAt: Date | null;
        };
        wallet: {
            id: string;
            userId: string;
            paidPts: number;
            bonusPts: number;
            plan: string;
        };
        error?: undefined;
    }>;
    refund(userId: string, orderId: string): Promise<{
        ok: boolean;
        error: string;
        order?: undefined;
        wallet?: undefined;
        refundShortfall?: undefined;
    } | {
        ok: boolean;
        order: {
            id: string;
            createdAt: Date;
            userId: string;
            status: string;
            currency: string;
            packageId: string;
            amount: number;
            paidAt: Date | null;
        };
        wallet: {
            id: string;
            userId: string;
            paidPts: number;
            bonusPts: number;
            plan: string;
        };
        refundShortfall: number;
        error?: undefined;
    }>;
}
