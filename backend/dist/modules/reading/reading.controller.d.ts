import { Request, Response } from "express";
import { ReadingService } from "./reading.service";
export declare class ReadingController {
    private readonly readingService;
    constructor(readingService: ReadingService);
    getBookmarks(req: Request, res: Response): Promise<{
        error: string;
    } | {
        bookmarks: Record<string, any[]>;
    }>;
    addBookmark(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        bookmarks: Record<string, any[]>;
    }>;
    removeBookmark(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        bookmarks: Record<string, any[]>;
    }>;
    getHistory(req: Request, res: Response): Promise<{
        error: string;
    } | {
        history: {
            id: string;
            seriesId: string;
            episodeId: string;
            title: string;
            percent: number;
            createdAt: Date;
        }[];
    }>;
    addHistory(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        history: {
            id: string;
            seriesId: string;
            episodeId: string;
            title: string;
            percent: number;
            createdAt: Date;
        }[];
    }>;
}
