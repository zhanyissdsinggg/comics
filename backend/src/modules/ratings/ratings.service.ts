import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async setRating(seriesId: string, userId: string, value: number) {
    const ratingValue = Math.min(5, Math.max(1, Number(value || 0)));
    await this.prisma.rating.upsert({
      where: { userId_seriesId: { userId, seriesId } },
      update: { rating: ratingValue },
      create: { userId, seriesId, rating: ratingValue },
    });
    const stats = await this.prisma.rating.aggregate({
      where: { seriesId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const avg = Number(stats._avg.rating || 0);
    const count = Number(stats._count.rating || 0);
    await this.prisma.series.update({
      where: { id: seriesId },
      data: { rating: avg, ratingCount: count },
    });
    return { rating: Number(avg.toFixed(2)), count };
  }
}
