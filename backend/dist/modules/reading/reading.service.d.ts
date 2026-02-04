import { PrismaService } from "../../common/prisma/prisma.service";
export declare class ReadingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getBookmarks(userId: string): Promise<Record<string, any[]>>;
    addBookmark(userId: string, seriesId: string, entry: any): Promise<Record<string, any[]>>;
    removeBookmark(userId: string, seriesId: string, bookmarkId: string): Promise<Record<string, any[]>>;
    getHistory(userId: string): Promise<{
        id: string;
        seriesId: string;
        episodeId: string;
        title: string;
        percent: number;
        createdAt: Date;
    }[]>;
    addHistory(userId: string, payload: any): Promise<{
        id: string;
        seriesId: string;
        episodeId: string;
        title: string;
        percent: number;
        createdAt: Date;
    }[]>;
}
