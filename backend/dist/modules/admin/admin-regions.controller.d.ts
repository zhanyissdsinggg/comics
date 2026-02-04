import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class AdminRegionsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getConfig(req: Request, res: Response): Promise<{
        error: string;
    } | {
        config: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | {
            countryCodes: any[];
            lengthRules: {};
        };
    }>;
    save(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        config: import("@prisma/client/runtime/library").JsonValue;
    }>;
}
