import { PrismaService } from "../../common/prisma/prisma.service";
export declare class MissionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private cloneDefault;
    list(userId: string): Promise<any>;
    report(userId: string, eventType: string): Promise<any>;
    claim(userId: string, missionId: string): Promise<{
        ok: boolean;
        error: string;
        reward?: undefined;
        state?: undefined;
    } | {
        ok: boolean;
        reward: any;
        state: any;
        error?: undefined;
    }>;
}
