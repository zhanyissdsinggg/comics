import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class EpisodeService {
  constructor(private readonly prisma: PrismaService) {}

  async getEpisode(seriesId: string, episodeId: string) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) {
      return null;
    }
    const stored = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    const hasPages = Array.isArray(stored?.pages) && stored.pages.length > 0;
    const hasParagraphs = Array.isArray(stored?.paragraphs) && stored.paragraphs.length > 0;
    if (hasPages || hasParagraphs || stored?.text) {
      if (series.type === "novel") {
        const paragraphs =
          (Array.isArray(stored.paragraphs) ? stored.paragraphs : stored.paragraphs || []) ||
          String(stored.text || "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        return {
          episode: {
            id: stored.id,
            seriesId,
            number: stored.number,
            title: stored.title,
            type: "novel",
            paragraphs,
            previewParagraphs: 3,
          },
        };
      }
      return {
        episode: {
          id: stored.id,
          seriesId,
          number: stored.number,
          title: stored.title,
          type: "comic",
          pages: Array.isArray(stored.pages) ? stored.pages : stored.pages || [],
        },
      };
    }
    const number = Number(episodeId.replace(`${seriesId}e`, "")) || 1;
    if (series.type === "novel") {
      return {
        episode: {
          id: episodeId,
          seriesId,
          number,
          title: `Episode ${number}`,
          type: "novel",
          paragraphs: Array.from({ length: 16 }, (_, idx) =>
            `(${seriesId}-${episodeId}) Paragraph ${idx + 1}. Lorem ipsum dolor sit amet.`
          ),
          previewParagraphs: 3,
        },
      };
    }
    return {
      episode: {
        id: episodeId,
        seriesId,
        number,
        title: `Episode ${number}`,
        type: "comic",
        pages: Array.from({ length: 18 }, (_, idx) => ({
          url: `https://placehold.co/800x1200?text=${seriesId}-${episodeId}-P${idx + 1}`,
          w: 800,
          h: 1200,
        })),
      },
    };
  }
}
