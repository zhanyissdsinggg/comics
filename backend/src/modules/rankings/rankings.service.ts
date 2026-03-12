import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { isSeriesVisibilitySchemaDrift, querySeriesVisibilityCompat } from "../../common/utils/series-visibility";

@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(type: string, adult: boolean) {
    try {
      const list = await this.prisma.series.findMany({
        where: adult ? { isPublished: true } : { adult: false, isPublished: true },
      });
      const publishedList = list.filter((series) => series.isPublished !== false);
      if (type === "new") {
        return [...publishedList].reverse();
      }
      return [...publishedList].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } catch (error) {
      if (!isSeriesVisibilitySchemaDrift(error)) {
        throw error;
      }
      const fallbackList = await querySeriesVisibilityCompat(this.prisma, {
        adult: adult ? null : false,
        onlyPublished: true,
      });
      if (type === "new") {
        return [...fallbackList].reverse();
      }
      return [...fallbackList].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
  }
}
