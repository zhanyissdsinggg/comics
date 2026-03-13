import { Injectable } from "@nestjs/common";
import { Promotion } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ExpiringMapCache } from "../../common/utils/runtime-cache";
import { isSeriesVisibilitySchemaDrift, querySeriesVisibilityCompat } from "../../common/utils/series-visibility";
import { getSubscriptionPayload } from "../../common/utils/subscription";

type FollowedSeriesEpisodeRow = {
  seriesId: string;
  seriesTitle: string;
  seriesTtfEnabled: boolean;
  seriesTtfIntervalHours: number | null;
  episodeId: string;
  episodeTitle: string;
  episodeTtfEligible: boolean;
  episodeTtfReadyAt: Date | string | null;
  episodeReleasedAt: Date | string | null;
};

const ACTIVE_PROMOTIONS_CACHE_MS = 60_000;
const NOTIFICATION_LIST_CACHE_MS = 15_000;
const NOTIFICATION_LIST_CACHE_MAX_USERS = 1_000;

@Injectable()
export class NotificationsService {
  private activePromotionsCache: { expiresAt: number; items: Promotion[] } | null = null;
  private readonly notificationListCache = new ExpiringMapCache<any[]>(
    NOTIFICATION_LIST_CACHE_MS,
    NOTIFICATION_LIST_CACHE_MAX_USERS,
  );
  private readonly notificationListInflight = new Map<string, Promise<any[]>>();

  constructor(private readonly prisma: PrismaService) {}

  private clearUserNotificationCache(userId: string) {
    this.notificationListCache.delete(userId);
    this.notificationListInflight.delete(userId);
  }

  private async listVisibleSeries(seriesIds: string[]) {
    if (seriesIds.length === 0) {
      return [];
    }

    try {
      return await this.prisma.series.findMany({
        where: { id: { in: seriesIds }, isPublished: true },
        select: {
          id: true,
          title: true,
          ttfEnabled: true,
          ttfIntervalHours: true,
        },
      });
    } catch (error) {
      if (!isSeriesVisibilitySchemaDrift(error)) {
        throw error;
      }
      return querySeriesVisibilityCompat(this.prisma, {
        ids: seriesIds,
        onlyPublished: true,
        select: ["id", "title", "ttfEnabled", "ttfIntervalHours", "isPublished"],
      });
    }
  }

  private async listFollowedSeriesWithLatestEpisode(userId: string) {
    try {
      const rows = await this.prisma.$queryRaw<FollowedSeriesEpisodeRow[]>`
        SELECT
          s.id AS "seriesId",
          s.title AS "seriesTitle",
          s."ttfEnabled" AS "seriesTtfEnabled",
          s."ttfIntervalHours" AS "seriesTtfIntervalHours",
          e.id AS "episodeId",
          e.title AS "episodeTitle",
          e."ttfEligible" AS "episodeTtfEligible",
          e."ttfReadyAt" AS "episodeTtfReadyAt",
          e."releasedAt" AS "episodeReleasedAt"
        FROM "follows" f
        INNER JOIN "series" s
          ON s.id = f."seriesId"
         AND s."isPublished" = true
        INNER JOIN LATERAL (
          SELECT
            ep.id,
            ep.title,
            ep."ttfEligible",
            ep."ttfReadyAt",
            ep."releasedAt"
          FROM "episodes" ep
          WHERE ep."seriesId" = s.id
            AND ep."isDeleted" = false
          ORDER BY ep."number" DESC
          LIMIT 1
        ) e ON true
        WHERE f."userId" = ${userId}
      `;

      return rows.map((row) => ({
        series: {
          id: row.seriesId,
          title: row.seriesTitle,
          ttfEnabled: Boolean(row.seriesTtfEnabled),
          ttfIntervalHours: Number(row.seriesTtfIntervalHours || 24),
        },
        latestEpisode: {
          id: row.episodeId,
          title: row.episodeTitle,
          ttfEligible: Boolean(row.episodeTtfEligible),
          ttfReadyAt: row.episodeTtfReadyAt,
          releasedAt: row.episodeReleasedAt,
        },
      }));
    } catch (_error) {
      const followed = await this.prisma.follow.findMany({
        where: { userId },
        select: { seriesId: true },
      });
      const seriesIds = followed.map((row) => row.seriesId);
      const [seriesList, latestEpisodes] = await Promise.all([
        this.listVisibleSeries(seriesIds),
        seriesIds.length
          ? this.prisma.episode.findMany({
              where: { seriesId: { in: seriesIds } },
              orderBy: [{ seriesId: "asc" }, { number: "desc" }],
              distinct: ["seriesId"],
            })
          : Promise.resolve([]),
      ]);
      const latestEpisodeBySeriesId = new Map(
        latestEpisodes.map((episode) => [episode.seriesId, episode]),
      );

      return seriesList
        .map((series) => ({
          series,
          latestEpisode: latestEpisodeBySeriesId.get(series.id) || null,
        }))
        .filter((entry) => entry.latestEpisode);
    }
  }

  private async getActivePromotions() {
    if (this.activePromotionsCache && this.activePromotionsCache.expiresAt > Date.now()) {
      return this.activePromotionsCache.items;
    }

    const promotions = await this.prisma.promotion.findMany({ where: { active: true } });
    this.activePromotionsCache = {
      items: promotions,
      expiresAt: Date.now() + ACTIVE_PROMOTIONS_CACHE_MS,
    };
    return promotions;
  }

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

  private sortNotifications(items: any[]) {
    return [...items].sort((left, right) => {
      const leftTs = new Date(left?.createdAt || 0).getTime();
      const rightTs = new Date(right?.createdAt || 0).getTime();
      return rightTs - leftTs;
    });
  }

  private async buildNotificationList(userId: string) {
    const nextPayloads: any[] = [];
    const [followedSeries, existingNotifications] = await Promise.all([
      this.listFollowedSeriesWithLatestEpisode(userId),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const needsSubscription = followedSeries.some((entry) => entry.latestEpisode?.ttfEligible);
    const [promotions, subscription] = await Promise.all([
      this.getActivePromotions(),
      needsSubscription ? getSubscriptionPayload(this.prisma, userId) : Promise.resolve(null),
    ]);

    for (const entry of followedSeries) {
      const series = entry.series;
      const latestEpisode = entry.latestEpisode;
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

    const existingById = new Map(existingNotifications.map((item) => [item.id, item]));
    const generatedIds = new Set(nextPayloads.map((payload) => payload.id));
    const missingPayloads = nextPayloads.filter((payload) => !existingById.has(payload.id));

    if (nextPayloads.length > 0) {
      if (missingPayloads.length > 0) {
        await this.prisma.notification.createMany({
          data: missingPayloads.map((payload) => this.buildPayload(payload)),
          skipDuplicates: true,
        });
      }
    }

    const generatedNotifications = nextPayloads.map((payload) => {
      const existing = existingById.get(payload.id);
      if (existing) {
        return existing;
      }
      return this.buildPayload(payload);
    });

    const manualNotifications = existingNotifications.filter((item) => !generatedIds.has(item.id));
    return this.sortNotifications([...generatedNotifications, ...manualNotifications]);
  }

  async list(userId: string) {
    const cached = this.notificationListCache.get(userId);
    if (cached !== null) {
      return cached;
    }

    const inflight = this.notificationListInflight.get(userId);
    if (inflight) {
      return inflight;
    }

    const request = this.buildNotificationList(userId)
      .then((items) => this.notificationListCache.set(userId, items))
      .finally(() => {
        this.notificationListInflight.delete(userId);
      });

    this.notificationListInflight.set(userId, request);
    return request;
  }

  async markRead(userId: string, notificationIds: string[]) {
    this.clearUserNotificationCache(userId);
    await this.prisma.notification.updateMany({
      where: { userId, id: { in: notificationIds } },
      data: { read: true },
    });
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return this.notificationListCache.set(userId, notifications);
  }
}
