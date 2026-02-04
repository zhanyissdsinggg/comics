import { PrismaService } from "../prisma/prisma.service";
export declare function getSubscriptionPayload(prisma: PrismaService, userId: string): Promise<{
    active: boolean;
    planId: string;
    startedAt: Date;
    renewAt: Date;
    perks: {
        discountPct: any;
        dailyFreeUnlocks: any;
        ttfMultiplier: any;
        voucherPts: any;
    };
}>;
export declare function getSubscriptionUsage(prisma: PrismaService, userId: string): Promise<{
    id: string;
    userId: string;
    dateKey: string;
    used: number;
}>;
export declare function markDailyUnlockUsed(prisma: PrismaService, userId: string): Promise<{
    id: string;
    userId: string;
    dateKey: string;
    used: number;
}>;
export declare function getSubscriptionVoucherUsage(prisma: PrismaService, userId: string): Promise<{
    id: string;
    userId: string;
    dateKey: string;
    used: boolean;
}>;
export declare function markSubscriptionVoucherUsed(prisma: PrismaService, userId: string): Promise<{
    id: string;
    userId: string;
    dateKey: string;
    used: boolean;
}>;
export declare function getSubscriptionVoucher(prisma: PrismaService, userId: string, subscription: any): Promise<{
    id: string;
    code: string;
    type: string;
    value: number;
    remainingUses: number;
    label: string;
    source: string;
}>;
export declare function buildWalletSnapshot(prisma: PrismaService, userId: string, wallet: any): Promise<any>;
