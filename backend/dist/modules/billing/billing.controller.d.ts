import { PrismaService } from "../../common/prisma/prisma.service";
export declare class BillingController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listTopups(): Promise<{
        packages: any;
    }>;
    listPlans(): Promise<{
        plans: any[];
    }>;
}
