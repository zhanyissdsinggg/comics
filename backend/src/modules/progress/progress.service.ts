import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgress(userId: string) {
    const rows = await this.prisma.progress.findMany({
      where: { userId },
    });
    return rows.reduce((acc, row) => {
      acc[row.seriesId] = {
        lastEpisodeId: row.lastEpisodeId,
        percent: row.percent,
        updatedAt: row.updatedAt?.getTime?.() || Date.now(),
      };
      return acc;
    }, {} as Record<string, any>);
  }

  async update(userId: string, seriesId: string, payload: any) {
    const updatedAt = payload?.updatedAt ? new Date(payload.updatedAt) : new Date();
    await this.prisma.progress.upsert({
      where: { userId_seriesId: { userId, seriesId } },
      update: {
        lastEpisodeId: payload.lastEpisodeId,
        percent: payload.percent,
        updatedAt,
      },
      create: {
        userId,
        seriesId,
        lastEpisodeId: payload.lastEpisodeId,
        percent: payload.percent,
        updatedAt,
      },
    });
    return this.getProgress(userId);
  }
}
