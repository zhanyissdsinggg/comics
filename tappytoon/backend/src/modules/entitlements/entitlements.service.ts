import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { chargeWallet } from "../../common/utils/wallet";
import {
  buildWalletSnapshot,
  getSubscriptionPayload,
  getSubscriptionUsage,
  getSubscriptionVoucher,
  markDailyUnlockUsed,
  markSubscriptionVoucherUsed,
} from "../../common/utils/subscription";

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  private applyTtfAcceleration(episode: any, series: any, subscription: any) {
    if (!episode.ttfEligible || !episode.ttfReadyAt) {
      return episode.ttfReadyAt ? new Date(episode.ttfReadyAt).getTime() : null;
    }
    const multiplier = subscription?.perks?.ttfMultiplier;
    if (!multiplier || multiplier >= 1) {
      return new Date(episode.ttfReadyAt).getTime();
    }
    const releasedAtMs = new Date(episode.releasedAt).getTime();
    if (Number.isNaN(releasedAtMs)) {
      return new Date(episode.ttfReadyAt).getTime();
    }
    const intervalHours = series?.ttfIntervalHours || 24;
    const baseReadyAtMs = releasedAtMs + intervalHours * 60 * 60 * 1000;
    const acceleratedReadyAtMs = releasedAtMs + intervalHours * multiplier * 60 * 60 * 1000;
    const originalReadyAtMs = new Date(episode.ttfReadyAt).getTime();
    const targetReadyAtMs = Number.isNaN(originalReadyAtMs)
      ? Math.min(baseReadyAtMs, acceleratedReadyAtMs)
      : Math.min(originalReadyAtMs, acceleratedReadyAtMs);
    return targetReadyAtMs;
  }

  async getEntitlement(userId: string, seriesId: string) {
    const rows = await this.prisma.entitlement.findMany({
      where: { userId, seriesId },
      select: { episodeId: true },
    });
    return { seriesId, unlockedEpisodeIds: rows.map((row) => row.episodeId) };
  }

  async unlockWithWallet(userId: string, seriesId: string, episodeId: string) {
    const entitlement = await this.getEntitlement(userId, seriesId);
    if (entitlement.unlockedEpisodeIds.includes(episodeId)) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      return { ok: true, entitlement, wallet: await buildWalletSnapshot(this.prisma, userId, wallet) };
    }
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode || episode.seriesId !== seriesId) {
      return { ok: false, status: 404, error: "EPISODE_NOT_FOUND" };
    }
    const subscription = await getSubscriptionPayload(this.prisma, userId);
    const usage = await getSubscriptionUsage(this.prisma, userId);
    const dailyLimit = subscription?.perks?.dailyFreeUnlocks || 0;
    const canDailyFree = subscription?.active && usage.used < dailyLimit;
    const voucher = await getSubscriptionVoucher(this.prisma, userId, subscription);
    const basePrice = Number(episode.pricePts || 0);
    let finalPrice = basePrice;
    if (canDailyFree) {
      finalPrice = 0;
    } else if (voucher?.value) {
      finalPrice = Math.max(0, basePrice - Number(voucher.value));
    }
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const normalizedWallet = wallet || { paidPts: 0, bonusPts: 0 };
    const charge = chargeWallet(normalizedWallet, finalPrice);
    if (!charge.ok) {
      return { ok: false, status: 402, error: "INSUFFICIENT_POINTS", shortfallPts: charge.shortfallPts };
    }
    const nextWallet = charge.wallet;
    const nextEntitlement = { ...entitlement, unlockedEpisodeIds: [...entitlement.unlockedEpisodeIds, episodeId] };
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.upsert({
        where: { userId },
        update: { paidPts: nextWallet.paidPts || 0, bonusPts: nextWallet.bonusPts || 0 },
        create: { userId, paidPts: nextWallet.paidPts || 0, bonusPts: nextWallet.bonusPts || 0, plan: "free" },
      });
      await tx.entitlement.create({
        data: { userId, seriesId, episodeId },
      });
    });
    if (canDailyFree) {
      await markDailyUnlockUsed(this.prisma, userId);
    } else if (voucher?.id) {
      await markSubscriptionVoucherUsed(this.prisma, userId);
    }
    return {
      ok: true,
      entitlement: nextEntitlement,
      wallet: await buildWalletSnapshot(this.prisma, userId, nextWallet),
    };
  }

  async unlockWithTtf(userId: string, seriesId: string, episodeId: string) {
    const entitlement = await this.getEntitlement(userId, seriesId);
    if (entitlement.unlockedEpisodeIds.includes(episodeId)) {
      return { ok: true, entitlement };
    }
    const subscription = await getSubscriptionPayload(this.prisma, userId);
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode || episode.seriesId !== seriesId) {
      return { ok: false, status: 404, error: "EPISODE_NOT_FOUND" };
    }
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    const readyAt = episode.ttfReadyAt
      ? this.applyTtfAcceleration(episode, series, subscription)
      : null;
    const now = Date.now();
    if (!episode.ttfEligible || !readyAt || now < readyAt) {
      return { ok: false, status: 409, error: "TTF_NOT_READY" };
    }
    await this.prisma.entitlement.create({
      data: { userId, seriesId, episodeId },
    });
    const nextEntitlement = { ...entitlement, unlockedEpisodeIds: [...entitlement.unlockedEpisodeIds, episodeId] };
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    return { ok: true, entitlement: nextEntitlement, wallet: await buildWalletSnapshot(this.prisma, userId, wallet) };
  }

  async unlockPack(userId: string, seriesId: string, episodeIds: string[], offerId: string) {
    const entitlement = await this.getEntitlement(userId, seriesId);
    const episodes = await this.prisma.episode.findMany({
      where: { seriesId },
    });
    const valid = episodeIds
      .map((id) => episodes.find((ep) => ep.id === id))
      .filter(Boolean);
    if (valid.length === 0) {
      return { ok: false, status: 400, error: "INVALID_EPISODES" };
    }
    const toCreate = valid.filter((ep) => !entitlement.unlockedEpisodeIds.includes(ep.id));
    if (toCreate.length === 0) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      return { ok: true, entitlement, wallet: await buildWalletSnapshot(this.prisma, userId, wallet) };
    }
    const subscription = await getSubscriptionPayload(this.prisma, userId);
    const voucher = await getSubscriptionVoucher(this.prisma, userId, subscription);
    const basePrice = valid.reduce((sum, ep) => sum + Number(ep.pricePts || 0), 0);
    let discount = 0;
    if (offerId && offerId.includes("pack_10")) {
      discount = 0.2;
    } else if (offerId && offerId.includes("pack_3")) {
      discount = 0.1;
    }
    let finalPrice = Math.max(0, Math.round(basePrice * (1 - discount)));
    if (voucher?.value) {
      finalPrice = Math.max(0, finalPrice - Number(voucher.value));
    }
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const normalizedWallet = wallet || { paidPts: 0, bonusPts: 0 };
    const charge = chargeWallet(normalizedWallet, finalPrice);
    if (!charge.ok) {
      return { ok: false, status: 402, error: "INSUFFICIENT_POINTS", shortfallPts: charge.shortfallPts };
    }
    const nextWallet = charge.wallet;
    const nextEntitlement = {
      ...entitlement,
      unlockedEpisodeIds: Array.from(
        new Set([...entitlement.unlockedEpisodeIds, ...toCreate.map((ep) => ep.id)])
      ),
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.upsert({
        where: { userId },
        update: { paidPts: nextWallet.paidPts || 0, bonusPts: nextWallet.bonusPts || 0 },
        create: { userId, paidPts: nextWallet.paidPts || 0, bonusPts: nextWallet.bonusPts || 0, plan: "free" },
      });
      await tx.entitlement.createMany({
        data: toCreate.map((ep) => ({ userId, seriesId, episodeId: ep.id })),
        skipDuplicates: true,
      });
    });
    if (voucher?.id) {
      await markSubscriptionVoucherUsed(this.prisma, userId);
    }
    return {
      ok: true,
      entitlement: nextEntitlement,
      wallet: await buildWalletSnapshot(this.prisma, userId, nextWallet),
    };
  }
}
