import { PromotionsService } from "./promotions.service";
export declare class PromotionsController {
    private readonly promotionsService;
    constructor(promotionsService: PromotionsService);
    list(): Promise<{
        promotions: {
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
        }[];
    }>;
}
