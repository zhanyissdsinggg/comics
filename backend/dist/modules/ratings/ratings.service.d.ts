import { PrismaService } from "../../common/prisma/prisma.service";
export declare class RatingsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    setRating(seriesId: string, userId: string, value: number): Promise<{
        rating: number;
        count: number;
    }>;
}
