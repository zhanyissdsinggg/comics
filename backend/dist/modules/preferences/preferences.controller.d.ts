import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class PreferencesController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPreferences(req: Request, res: Response): Promise<{
        error: string;
    } | {
        preferences: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
    }>;
    save(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        preferences: import("@prisma/client/runtime/library").JsonValue;
    }>;
}
