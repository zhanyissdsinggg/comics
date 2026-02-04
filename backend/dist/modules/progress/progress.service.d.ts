import { PrismaService } from "../../common/prisma/prisma.service";
export declare class ProgressService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProgress(userId: string): Promise<Record<string, any>>;
    update(userId: string, seriesId: string, payload: any): Promise<Record<string, any>>;
}
