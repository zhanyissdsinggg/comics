import { PromotionsService } from "./promotions.service";
export declare class PromotionsController {
    private readonly promotionsService;
    constructor(promotionsService: PromotionsService);
    list(): Promise<{
        promotions: {
            id: string;
            title: string;
            description: string;
            type: string;
            segment: string;
            active: boolean;
            startAt: Date | null;
            endAt: Date | null;
            bonusMultiplier: number;
            returningAfterDays: number;
            autoGrant: boolean;
            ctaType: string;
            ctaTarget: string;
            ctaLabel: string;
        }[];
    }>;
}
