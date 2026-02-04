import { PrismaService } from "../../common/prisma/prisma.service";
export declare class SubscriptionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    subscribe(userId: string, planId: string): Promise<{
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
    cancel(userId: string): Promise<any>;
}
