import { PrismaService } from "../../common/prisma/prisma.service";
export declare class OrdersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        status: string;
        currency: string;
        packageId: string;
        amount: number;
        paidAt: Date | null;
    }[]>;
    reconcile(userId: string): Promise<{
        updated: number;
        orders: {
            id: string;
            createdAt: Date;
            userId: string;
            status: string;
            currency: string;
            packageId: string;
            amount: number;
            paidAt: Date | null;
        }[];
    }>;
}
