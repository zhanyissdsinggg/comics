import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class ReadingService {
  constructor(private readonly prisma: PrismaService) {}

  async getBookmarks(userId: string) {
    const rows = await this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.reduce((acc, row) => {
      acc[row.seriesId] = acc[row.seriesId] || [];
      acc[row.seriesId].push({
        id: row.id,
        seriesId: row.seriesId,
        episodeId: row.episodeId,
        percent: row.percent,
        pageIndex: row.pageIndex,
        label: row.label,
        createdAt: row.createdAt,
      });
      return acc;
    }, {} as Record<string, any[]>);
  }

  async addBookmark(userId: string, seriesId: string, entry: any) {
    await this.prisma.bookmark.create({
      data: {
        userId,
        seriesId,
        episodeId: entry.episodeId,
        percent: entry.percent || 0,
        pageIndex: entry.pageIndex || 0,
        label: entry.label || "Bookmark",
      },
    });
    return this.getBookmarks(userId);
  }

  async removeBookmark(userId: string, seriesId: string, bookmarkId: string) {
    await this.prisma.bookmark.deleteMany({
      where: { id: bookmarkId, userId, seriesId },
    });
    return this.getBookmarks(userId);
  }

  async getHistory(userId: string) {
    const rows = await this.prisma.readingHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      seriesId: row.seriesId,
      episodeId: row.episodeId,
      title: row.title,
      percent: row.percent,
      createdAt: row.createdAt,
    }));
  }

  async addHistory(userId: string, payload: any) {
    await this.prisma.readingHistory.create({
      data: {
        userId,
        seriesId: payload.seriesId,
        episodeId: payload.episodeId,
        title: payload.title || "",
        percent: payload.percent || 0,
      },
    });
    return this.getHistory(userId);
  }
}
