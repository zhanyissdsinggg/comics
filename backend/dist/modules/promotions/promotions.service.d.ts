import { PrismaService } from "../../common/prisma/prisma.service";
export declare class PromotionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureDefaults;
    list(): Promise<{
        id: string;
        title: string;
        type: string;
        description: string;
        active: boolean;
        segment: string;
        startAt: Date | null;
        endAt: Date | null;
        bonusMultiplier: number;
        returningAfterDays: number;
        autoGrant: boolean;
        ctaType: string;
        ctaTarget: string;
        ctaLabel: string;
    }[]>;
}
