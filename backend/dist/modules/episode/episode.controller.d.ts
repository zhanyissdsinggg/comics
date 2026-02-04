import { EpisodeService } from "./episode.service";
import { Request } from "express";
import { Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { StatsService } from "../../common/services/stats.service";
export declare class EpisodeController {
    private readonly episodeService;
    private readonly prisma;
    private readonly statsService;
    constructor(episodeService: EpisodeService, prisma: PrismaService, statsService: StatsService);
    getEpisode(seriesId: string, episodeId: string, req: Request, res: Response): Promise<{
        error: string;
    } | {
        episode: {
            id: string;
            seriesId: string;
            number: number;
            title: string;
            type: string;
            paragraphs: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
            previewParagraphs: number;
            pages?: undefined;
        };
    } | {
        episode: {
            id: string;
            seriesId: string;
            number: number;
            title: string;
            type: string;
            pages: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
            paragraphs?: undefined;
            previewParagraphs?: undefined;
        };
    } | {
        episode: {
            id: string;
            seriesId: string;
            number: number;
            title: string;
            type: string;
            pages: {
                url: string;
                w: number;
                h: number;
            }[];
            paragraphs?: undefined;
            previewParagraphs?: undefined;
        };
    }>;
}
