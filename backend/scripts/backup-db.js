const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const OUTPUT = process.argv[2] || path.join(__dirname, "backup.json");

async function main() {
  const data = {
    users: await prisma.user.findMany(),
    sessions: await prisma.session.findMany(),
    authTokens: await prisma.authToken.findMany(),
    wallets: await prisma.wallet.findMany(),
    series: await prisma.series.findMany(),
    episodes: await prisma.episode.findMany(),
    entitlements: await prisma.entitlement.findMany(),
    orders: await prisma.order.findMany(),
    paymentIntents: await prisma.paymentIntent.findMany(),
    paymentRetries: await prisma.paymentRetry.findMany(),
    follows: await prisma.follow.findMany(),
    notifications: await prisma.notification.findMany(),
    comments: await prisma.comment.findMany(),
    commentLikes: await prisma.commentLike.findMany(),
    commentReplies: await prisma.commentReply.findMany(),
    ratings: await prisma.rating.findMany(),
    progress: await prisma.progress.findMany(),
    subscription: await prisma.subscription.findMany(),
    subscriptionUsage: await prisma.subscriptionUsage.findMany(),
    subscriptionVoucherUsage: await prisma.subscriptionVoucherUsage.findMany(),
    coupons: await prisma.coupon.findMany(),
    userCoupons: await prisma.userCoupon.findMany(),
    promotions: await prisma.promotion.findMany(),
    promotionFallback: await prisma.promotionFallback.findMany(),
    rewards: await prisma.rewardState.findMany(),
    missions: await prisma.missionState.findMany(),
    bookmarks: await prisma.bookmark.findMany(),
    history: await prisma.readingHistory.findMany(),
    searchLog: await prisma.searchLog.findMany(),
    dailyStats: await prisma.dailyStat.findMany(),
    dailyActives: await prisma.dailyActive.findMany(),
    seriesViewStats: await prisma.seriesViewStat.findMany(),
    trackingConfig: await prisma.trackingConfig.findMany(),
    emailConfig: await prisma.emailConfig.findMany(),
    regionConfig: await prisma.regionConfig.findMany(),
    topupPackages: await prisma.topupPackage.findMany(),
    subscriptionPlans: await prisma.subscriptionPlan.findMany(),
    userPreferences: await prisma.userPreference.findMany(),
    supportTickets: await prisma.supportTicket.findMany(),
    idempotencyKeys: await prisma.idempotencyKey.findMany(),
    rateLimitCounters: await prisma.rateLimitCounter.findMany(),
    auditLogs: await prisma.auditLog.findMany(),
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), "utf8");
  console.log(`Backup saved to ${OUTPUT}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
