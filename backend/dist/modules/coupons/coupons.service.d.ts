import { PrismaService } from "../../common/prisma/prisma.service";
export declare class CouponsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureCatalog;
    list(userId: string): Promise<{
        claimedAt: Date;
        id: string;
        code: string;
        type: string;
        value: number;
        remainingUses: number;
        label: string;
    }[]>;
    claim(userId: string, code: string): Promise<{
        ok: boolean;
        message: string;
        coupons?: undefined;
    } | {
        ok: boolean;
        coupons: {
            claimedAt: Date;
            id: string;
            code: string;
            type: string;
            value: number;
            remainingUses: number;
            label: string;
        }[];
        message?: undefined;
    }>;
}
