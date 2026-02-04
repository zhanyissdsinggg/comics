import { PrismaService } from "../../common/prisma/prisma.service";
export declare class RegionsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    config(): Promise<{
        config: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | {
            countryCodes: {
                code: string;
                label: string;
            }[];
            lengthRules: {
                "+1": number[];
                "+82": number[];
                "+86": number[];
                "+81": number[];
                "+65": number[];
            };
        };
    }>;
}
