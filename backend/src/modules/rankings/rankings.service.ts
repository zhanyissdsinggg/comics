import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { enrichSeriesWithStorefrontFields } from "../../common/utils/series-storefront-fields";
import { isSeriesVisibilitySchemaDrift, querySeriesVisibilityCompat } from "../../common/utils/series-visibility";

@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(type: string, adult: boolean) {
    const sortRankings = async <
      T extends {
        id?: string | null;
        author?: unknown;
        followers?: unknown;
        views?: unknown;
        isPublished?: boolean | null;
        rating?: number | null;
      },
    >(
      items: T[],
    ) => {
      const publishedList = items.filter((series) => series.isPublished !== false);
      const sortedList =
        type === "new"
          ? [...publishedList].reverse()
          : [...publishedList].sort((a, b) => (b.rating || 0) - (a.rating || 0));

      return enrichSeriesWithStorefrontFields(this.prisma, sortedList);
    };

    try {
      const list = await this.prisma.series.findMany({
        where: adult ? { isPublished: true } : { adult: false, isPublished: true },
      });
      return sortRankings(list);
    } catch (error) {
      if (!isSeriesVisibilitySchemaDrift(error)) {
        throw error;
      }
      const fallbackList = await querySeriesVisibilityCompat(this.prisma, {
        adult: adult ? null : false,
        onlyPublished: true,
      });
      return sortRankings(fallbackList);
    }
  }
}
