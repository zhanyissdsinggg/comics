import { PrismaService } from "../../common/prisma/prisma.service";
export declare class WalletService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getWallet(userId: string): Promise<{
        id: string;
        userId: string;
        paidPts: number;
        bonusPts: number;
        plan: string;
    }>;
    topup(userId: string, packageId: string): Promise<{
        ok: boolean;
        status: number;
        error: string;
        wallet?: undefined;
        order?: undefined;
    } | {
        ok: boolean;
        wallet: {
            id: string;
            userId: string;
            paidPts: number;
            bonusPts: number;
            plan: string;
        };
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
        status?: undefined;
        error?: undefined;
    }>;
}
