import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class AdminPromotionsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        promotions: {
            id: string;
            active: boolean;
            type: string;
            title: string;
            description: string;
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
    defaults(req: Request, res: Response): Promise<{
        error: string;
    } | {
        defaults: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
    }>;
    updateDefaults(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        defaults: import("@prisma/client/runtime/library").JsonValue;
    }>;
    create(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        promotion: {
            id: string;
            active: boolean;
            type: string;
            title: string;
            description: string;
            segment: string;
            startAt: Date | null;
            endAt: Date | null;
            bonusMultiplier: number;
            returningAfterDays: number;
            autoGrant: boolean;
            ctaType: string;
            ctaTarget: string;
            ctaLabel: string;
        };
    }>;
    update(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        promotion: {
            id: string;
            active: boolean;
            type: string;
            title: string;
            description: string;
            segment: string;
            startAt: Date | null;
            endAt: Date | null;
            bonusMultiplier: number;
            returningAfterDays: number;
            autoGrant: boolean;
            ctaType: string;
            ctaTarget: string;
            ctaLabel: string;
        };
    }>;
    remove(req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
    }>;
}
