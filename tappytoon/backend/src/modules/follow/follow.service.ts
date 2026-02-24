import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.follow.findMany({
      where: { userId },
      select: { seriesId: true },
    });
    return rows.map((row) => row.seriesId);
  }

  async update(userId: string, seriesId: string, action: string) {
    if (action === "UNFOLLOW") {
      await this.prisma.follow.deleteMany({ where: { userId, seriesId } });
      return this.list(userId);
    }
    await this.prisma.follow.upsert({
      where: { userId_seriesId: { userId, seriesId } },
      update: {},
      create: { userId, seriesId },
    });
    return this.list(userId);
  }
}
