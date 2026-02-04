import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
export declare class AdminSeriesController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private toSeriesPayload;
    private syncLatest;
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        series: {
            id: string;
            type: string;
            status: string;
            title: string;
            rating: number;
            adult: boolean;
            genres: string[];
            coverTone: string;
            coverUrl: string;
            badge: string;
            badges: string[];
            ratingCount: number;
            description: string;
            episodePrice: number;
            ttfEnabled: boolean;
            ttfIntervalHours: number;
            latestEpisodeId: string;
        }[];
    }>;
    create(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        series: {
            id: string;
            type: string;
            status: string;
            title: string;
            rating: number;
            adult: boolean;
            genres: string[];
            coverTone: string;
            coverUrl: string;
            badge: string;
            badges: string[];
            ratingCount: number;
            description: string;
            episodePrice: number;
            ttfEnabled: boolean;
            ttfIntervalHours: number;
            latestEpisodeId: string;
        };
    }>;
    detail(_key: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        series: {
            id: string;
            type: string;
            status: string;
            title: string;
            rating: number;
            adult: boolean;
            genres: string[];
            coverTone: string;
            coverUrl: string;
            badge: string;
            badges: string[];
            ratingCount: number;
            description: string;
            episodePrice: number;
            ttfEnabled: boolean;
            ttfIntervalHours: number;
            latestEpisodeId: string;
        };
    }>;
    update(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        series: {
            id: string;
            type: string;
            status: string;
            title: string;
            rating: number;
            adult: boolean;
            genres: string[];
            coverTone: string;
            coverUrl: string;
            badge: string;
            badges: string[];
            ratingCount: number;
            description: string;
            episodePrice: number;
            ttfEnabled: boolean;
            ttfIntervalHours: number;
            latestEpisodeId: string;
        };
    }>;
    remove(req: Request, res: Response): Promise<{
        error: string;
    } | {
        ok: boolean;
    }>;
    listEpisodes(req: Request, res: Response): Promise<{
        error: string;
    } | {
        episodes: {
            number: number;
            id: string;
            seriesId: string;
            title: string;
            releasedAt: Date;
            pricePts: number;
            ttfEligible: boolean;
            ttfReadyAt: Date | null;
            previewFreePages: number;
            pages: import("@prisma/client/runtime/library").JsonValue | null;
            paragraphs: import("@prisma/client/runtime/library").JsonValue | null;
            text: string | null;
        }[];
    }>;
    createEpisode(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        episodes: {
            number: number;
            id: string;
            seriesId: string;
            title: string;
            releasedAt: Date;
            pricePts: number;
            ttfEligible: boolean;
            ttfReadyAt: Date | null;
            previewFreePages: number;
            pages: import("@prisma/client/runtime/library").JsonValue | null;
            paragraphs: import("@prisma/client/runtime/library").JsonValue | null;
            text: string | null;
        }[];
    }>;
    bulkUpdateEpisodes(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        episodes: {
            number: number;
            id: string;
            seriesId: string;
            title: string;
            releasedAt: Date;
            pricePts: number;
            ttfEligible: boolean;
            ttfReadyAt: Date | null;
            previewFreePages: number;
            pages: import("@prisma/client/runtime/library").JsonValue | null;
            paragraphs: import("@prisma/client/runtime/library").JsonValue | null;
            text: string | null;
        }[];
    }>;
    uploadEpisodes(files: any[], body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        episodes: {
            number: number;
            id: string;
            seriesId: string;
            title: string;
            releasedAt: Date;
            pricePts: number;
            ttfEligible: boolean;
            ttfReadyAt: Date | null;
            previewFreePages: number;
            pages: import("@prisma/client/runtime/library").JsonValue | null;
            paragraphs: import("@prisma/client/runtime/library").JsonValue | null;
            text: string | null;
        }[];
        created: number;
    }>;
    updateEpisode(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        episode: {
            number: number;
            id: string;
            seriesId: string;
            title: string;
            releasedAt: Date;
            pricePts: number;
            ttfEligible: boolean;
            ttfReadyAt: Date | null;
            previewFreePages: number;
            pages: import("@prisma/client/runtime/library").JsonValue | null;
            paragraphs: import("@prisma/client/runtime/library").JsonValue | null;
            text: string | null;
        };
    }>;
    removeEpisode(req: Request, res: Response): Promise<{
        error: string;
    } | {
        episodes: {
            number: number;
            id: string;
            seriesId: string;
            title: string;
            releasedAt: Date;
            pricePts: number;
            ttfEligible: boolean;
            ttfReadyAt: Date | null;
            previewFreePages: number;
            pages: import("@prisma/client/runtime/library").JsonValue | null;
            paragraphs: import("@prisma/client/runtime/library").JsonValue | null;
            text: string | null;
        }[];
    }>;
}
