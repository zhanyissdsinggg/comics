import { PrismaService } from "./common/prisma/prisma.service";
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    check(): {
        ok: boolean;
        time: string;
    };
    detail(): Promise<{
        ok: boolean;
        time: string;
        dbOk: boolean;
        pendingOrders: number;
        retryPending: number;
    }>;
}
