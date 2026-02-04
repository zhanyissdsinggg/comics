import { EntitlementsService } from "./entitlements.service";
import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class EntitlementsController {
    private readonly entitlementsService;
    private readonly prisma;
    constructor(entitlementsService: EntitlementsService, prisma: PrismaService);
    getEntitlement(seriesId: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        entitlement: {
            seriesId: string;
            unlockedEpisodeIds: string[];
        };
    }>;
    unlock(body: any, req: Request, res: Response): Promise<any>;
}
