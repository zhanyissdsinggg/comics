import { SubscriptionService } from "./subscription.service";
import { Request, Response } from "express";
export declare class SubscriptionController {
    private readonly subscriptionService;
    constructor(subscriptionService: SubscriptionService);
    subscribe(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        subscription: {
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
        };
    }>;
    cancel(req: Request, res: Response): Promise<{
        error: string;
    } | {
        subscription: any;
    }>;
}
