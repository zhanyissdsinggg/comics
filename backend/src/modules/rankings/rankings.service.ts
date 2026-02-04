import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(type: string, adult: boolean) {
    const list = await this.prisma.series.findMany({
      where: adult ? {} : { adult: false },
    });
    if (type === "new") {
      return [...list].reverse();
    }
    return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
}
