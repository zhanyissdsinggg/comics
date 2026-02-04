import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class SupportController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
    }>;
}
