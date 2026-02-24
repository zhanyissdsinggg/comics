const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const INPUT = process.argv[2] || path.join(__dirname, "backup.json");

async function main() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Backup file not found: ${INPUT}`);
  }
  const raw = fs.readFileSync(INPUT, "utf8");
  const data = JSON.parse(raw);

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany();
    await tx.rateLimitCounter.deleteMany();
    await tx.idempotencyKey.deleteMany();
    await tx.supportTicket.deleteMany();
    await tx.userPreference.deleteMany();
    await tx.subscriptionPlan.deleteMany();
    await tx.topupPackage.deleteMany();
    await tx.regionConfig.deleteMany();
    await tx.emailConfig.deleteMany();
    await tx.trackingConfig.deleteMany();
    await tx.seriesViewStat.deleteMany();
    await tx.dailyActive.deleteMany();
    await tx.dailyStat.deleteMany();
    await tx.searchLog.deleteMany();
    await tx.readingHistory.deleteMany();
    await tx.bookmark.deleteMany();
    await tx.missionState.deleteMany();
    await tx.rewardState.deleteMany();
    await tx.promotionFallback.deleteMany();
    await tx.promotion.deleteMany();
    await tx.userCoupon.deleteMany();
    await tx.coupon.deleteMany();
    await tx.subscriptionVoucherUsage.deleteMany();
    await tx.subscriptionUsage.deleteMany();
    await tx.subscription.deleteMany();
    await tx.progress.deleteMany();
    await tx.rating.deleteMany();
    await tx.commentLike.deleteMany();
    await tx.commentReply.deleteMany();
    await tx.comment.deleteMany();
    await tx.notification.deleteMany();
    await tx.follow.deleteMany();
    await tx.paymentRetry.deleteMany();
    await tx.paymentIntent.deleteMany();
    await tx.order.deleteMany();
    await tx.entitlement.deleteMany();
    await tx.episode.deleteMany();
    await tx.series.deleteMany();
    await tx.wallet.deleteMany();
    await tx.authToken.deleteMany();
    await tx.session.deleteMany();
    await tx.user.deleteMany();

    if (data.users?.length) await tx.user.createMany({ data: data.users });
    if (data.sessions?.length) await tx.session.createMany({ data: data.sessions });
    if (data.authTokens?.length) await tx.authToken.createMany({ data: data.authTokens });
    if (data.wallets?.length) await tx.wallet.createMany({ data: data.wallets });
    if (data.series?.length) await tx.series.createMany({ data: data.series });
    if (data.episodes?.length) await tx.episode.createMany({ data: data.episodes });
    if (data.entitlements?.length) await tx.entitlement.createMany({ data: data.entitlements });
    if (data.orders?.length) await tx.order.createMany({ data: data.orders });
    if (data.paymentIntents?.length) await tx.paymentIntent.createMany({ data: data.paymentIntents });
    if (data.paymentRetries?.length) await tx.paymentRetry.createMany({ data: data.paymentRetries });
    if (data.follows?.length) await tx.follow.createMany({ data: data.follows });
    if (data.notifications?.length) await tx.notification.createMany({ data: data.notifications });
    if (data.comments?.length) await tx.comment.createMany({ data: data.comments });
    if (data.commentLikes?.length) await tx.commentLike.createMany({ data: data.commentLikes });
    if (data.commentReplies?.length) await tx.commentReply.createMany({ data: data.commentReplies });
    if (data.ratings?.length) await tx.rating.createMany({ data: data.ratings });
    if (data.progress?.length) await tx.progress.createMany({ data: data.progress });
    if (data.subscription?.length) await tx.subscription.createMany({ data: data.subscription });
    if (data.subscriptionUsage?.length) await tx.subscriptionUsage.createMany({ data: data.subscriptionUsage });
    if (data.subscriptionVoucherUsage?.length) await tx.subscriptionVoucherUsage.createMany({ data: data.subscriptionVoucherUsage });
    if (data.coupons?.length) await tx.coupon.createMany({ data: data.coupons });
    if (data.userCoupons?.length) await tx.userCoupon.createMany({ data: data.userCoupons });
    if (data.promotions?.length) await tx.promotion.createMany({ data: data.promotions });
    if (data.promotionFallback?.length) await tx.promotionFallback.createMany({ data: data.promotionFallback });
    if (data.rewards?.length) await tx.rewardState.createMany({ data: data.rewards });
    if (data.missions?.length) await tx.missionState.createMany({ data: data.missions });
    if (data.bookmarks?.length) await tx.bookmark.createMany({ data: data.bookmarks });
    if (data.history?.length) await tx.readingHistory.createMany({ data: data.history });
    if (data.searchLog?.length) await tx.searchLog.createMany({ data: data.searchLog });
    if (data.dailyStats?.length) await tx.dailyStat.createMany({ data: data.dailyStats });
    if (data.dailyActives?.length) await tx.dailyActive.createMany({ data: data.dailyActives });
    if (data.seriesViewStats?.length) await tx.seriesViewStat.createMany({ data: data.seriesViewStats });
    if (data.trackingConfig?.length) await tx.trackingConfig.createMany({ data: data.trackingConfig });
    if (data.emailConfig?.length) await tx.emailConfig.createMany({ data: data.emailConfig });
    if (data.regionConfig?.length) await tx.regionConfig.createMany({ data: data.regionConfig });
    if (data.topupPackages?.length) await tx.topupPackage.createMany({ data: data.topupPackages });
    if (data.subscriptionPlans?.length) await tx.subscriptionPlan.createMany({ data: data.subscriptionPlans });
    if (data.userPreferences?.length) await tx.userPreference.createMany({ data: data.userPreferences });
    if (data.supportTickets?.length) await tx.supportTicket.createMany({ data: data.supportTickets });
    if (data.idempotencyKeys?.length) await tx.idempotencyKey.createMany({ data: data.idempotencyKeys });
    if (data.rateLimitCounters?.length) await tx.rateLimitCounter.createMany({ data: data.rateLimitCounters });
    if (data.auditLogs?.length) await tx.auditLog.createMany({ data: data.auditLogs });
  });

  console.log(`Restore completed from ${INPUT}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
