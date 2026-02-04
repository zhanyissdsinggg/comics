import { PrismaService } from "../../common/prisma/prisma.service";
export declare class CommentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(seriesId: string, userId: string): Promise<{
        id: any;
        seriesId: any;
        userId: any;
        author: any;
        text: any;
        createdAt: any;
        likes: any;
        replies: any;
        likeCount: any;
        likedByUser: any;
    }[]>;
    add(seriesId: string, userId: string, text: string): Promise<{
        id: any;
        seriesId: any;
        userId: any;
        author: any;
        text: any;
        createdAt: any;
        likes: any;
        replies: any;
        likeCount: any;
        likedByUser: any;
    }>;
    like(_seriesId: string, commentId: string, userId: string): Promise<{
        id: any;
        seriesId: any;
        userId: any;
        author: any;
        text: any;
        createdAt: any;
        likes: any;
        replies: any;
        likeCount: any;
        likedByUser: any;
    }>;
    reply(_seriesId: string, commentId: string, userId: string, text: string): Promise<{
        id: any;
        seriesId: any;
        userId: any;
        author: any;
        text: any;
        createdAt: any;
        likes: any;
        replies: any;
        likeCount: any;
        likedByUser: any;
    }>;
    private decorate;
}
