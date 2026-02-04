import { PrismaService } from "../../common/prisma/prisma.service";
export declare class TrackingController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getConfig(): Promise<{
        config: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | {
            values: {};
            updatedAt: any;
        };
    }>;
}
