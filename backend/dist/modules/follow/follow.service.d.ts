import { PrismaService } from "../../common/prisma/prisma.service";
export declare class FollowService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string): Promise<string[]>;
    update(userId: string, seriesId: string, action: string): Promise<string[]>;
}
