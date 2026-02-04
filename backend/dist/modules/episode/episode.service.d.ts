import { PrismaService } from "../../common/prisma/prisma.service";
export declare class EpisodeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getEpisode(seriesId: string, episodeId: string): Promise<{
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
