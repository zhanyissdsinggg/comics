import { CommentsService } from "./comments.service";
import { Request, Response } from "express";
export declare class CommentsController {
    private readonly commentsService;
    constructor(commentsService: CommentsService);
    list(seriesId: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        comments: {
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
        }[];
    }>;
    create(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        comment: {
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
        };
    }>;
}
