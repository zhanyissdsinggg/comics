import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getSubscriptionPayload } from "../../common/utils/subscription";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private applyTtfAcceleration(episode: any, series: any, subscription: any) {
    if (!episode?.ttfEligible) {
      return null;
    }
    const readyAtMs = episode.ttfReadyAt ? new Date(episode.ttfReadyAt).getTime() : NaN;
    if (!episode.releasedAt) {
      return Number.isNaN(readyAtMs) ? null : readyAtMs;
    }
    const multiplier = subscription?.perks?.ttfMultiplier;
    if (!multiplier || multiplier >= 1) {
      return Number.isNaN(readyAtMs) ? null : readyAtMs;
    }
    const releasedAtMs = new Date(episode.releasedAt).getTime();
    if (Number.isNaN(releasedAtMs)) {
      return Number.isNaN(readyAtMs) ? null : readyAtMs;
    }
    const intervalHours = series?.ttfIntervalHours || 24;
    const baseReadyAtMs = releasedAtMs + intervalHours * 60 * 60 * 1000;
    const acceleratedReadyAtMs = releasedAtMs + intervalHours * multiplier * 60 * 60 * 1000;
    const fallbackReadyAtMs = Number.isNaN(readyAtMs) ? baseReadyAtMs : readyAtMs;
    return Math.min(fallbackReadyAtMs, acceleratedReadyAtMs);
  }

  private buildPayload(payload: any) {
    return {
      id: payload.id,
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      seriesId: payload.seriesId || null,
      episodeId: payload.episodeId || null,
      read: false,
      createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
    };
  }

  async list(userId: string) {
    const followed = await this.prisma.follow.findMany({
      where: { userId },
      select: { seriesId: true },
    });
    const nextPayloads: any[] = [];
    const seriesIds = followed.map((row) => row.seriesId);
    const seriesList = seriesIds.length
      ? await this.prisma.series.findMany({
          where: { id: { in: seriesIds } },
          select: {
            id: true,
            title: true,
            ttfEnabled: true,
            ttfIntervalHours: true,
          },
        })
      : [];
    const subscription = await getSubscriptionPayload(this.prisma, userId);
    for (const series of seriesList) {
      const latestEpisode = await this.prisma.episode.findFirst({
        where: { seriesId: series.id },
        orderBy: { number: "desc" },
      });
      if (!latestEpisode) {
        continue;
      }
      const id = `NEW_EPISODE_${series.id}_${latestEpisode.id}`;
      nextPayloads.push({
        id,
        userId,
        type: "NEW_EPISODE",
        title: `${series.title} updated`,
        message: `${latestEpisode.title} is now available.`,
        seriesId: series.id,
        episodeId: latestEpisode.id,
        createdAt: latestEpisode.releasedAt,
      });
      if (latestEpisode.ttfEligible) {
        const readyAtMs = this.applyTtfAcceleration(latestEpisode, series, subscription);
        if (readyAtMs && readyAtMs <= Date.now()) {
          const ttfId = `TTF_READY_${series.id}_${latestEpisode.id}`;
          nextPayloads.push({
            id: ttfId,
            userId,
            type: "TTF_READY",
            title: `${series.title} free claim`,
            message: `${latestEpisode.title} is ready to claim.`,
            seriesId: series.id,
            episodeId: latestEpisode.id,
            createdAt: new Date(readyAtMs).toISOString(),
          });
        }
      }
    }
    const promotions = await this.prisma.promotion.findMany({ where: { active: true } });
    promotions.forEach((promo) => {
      const id = `PROMO_${promo.id}`;
      nextPayloads.push({
        id,
        userId,
        type: "PROMO",
        title: promo.title,
        message: promo.description,
        createdAt: new Date().toISOString(),
      });
    });
    if (nextPayloads.length > 0) {
      await Promise.all(
        nextPayloads.map((payload) =>
          this.prisma.notification.upsert({
            where: { id: payload.id },
            update: {},
            create: this.buildPayload(payload),
          })
        )
      );
    }
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async markRead(userId: string, notificationIds: string[]) {
    await this.prisma.notification.updateMany({
      where: { userId, id: { in: notificationIds } },
      data: { read: true },
    });
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}
