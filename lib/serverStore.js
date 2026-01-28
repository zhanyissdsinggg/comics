import { SERIES_CATALOG } from "./seriesCatalog";

const walletByUser = new Map();
const entitlementByUser = new Map();
const ordersByUser = new Map();
const followByUser = new Map();
const notificationsByUser = new Map();
const idempotencyByUser = new Map();
const rateLimitByUser = new Map();
let orderCounter = 1;

const DEFAULT_WALLET = {
  paidPts: 120,
  bonusPts: 20,
  plan: "free",
  subscription: null,
};

const DEDUCT_ORDER = "BONUS_FIRST";

function parseLatestNumber(value) {
  if (!value) {
    return 0;
  }
  const match = String(value).match(/(\d+)/);
  if (!match) {
    return 0;
  }
  return Number.parseInt(match[1], 10) || 0;
}

function buildEpisodes(seriesId, latestNumber, pricePts) {
  const now = Date.now();
  return Array.from({ length: latestNumber }, (_, index) => {
    const number = index + 1;
    const releasedAt = new Date(
      now - (latestNumber - number) * 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const ttfEligible = number % 4 !== 0;
    const ttfReadyAt = ttfEligible
      ? new Date(now + (number % 3 === 0 ? -1 : 2) * 60 * 60 * 1000).toISOString()
      : null;
    const previewFreePages = number <= 3 ? 3 : 0;

    return {
      id: `${seriesId}e${number}`,
      seriesId,
      number,
      title: `Episode ${number}`,
      releasedAt,
      pricePts,
      ttfEligible,
      ttfReadyAt,
      previewFreePages,
    };
  });
}

export function getUserIdFromCookies(request) {
  const cookie = request.cookies?.get("mn_user_id");
  return cookie?.value || "guest";
}

export function getSeriesEpisodes(seriesId) {
  const series = SERIES_CATALOG.find((item) => item.id === seriesId);
  if (!series) {
    return [];
  }
  const latestNumber = parseLatestNumber(series.latest);
  return buildEpisodes(seriesId, latestNumber, series.pricing.episodePrice);
}

export function getWallet(userId) {
  if (!walletByUser.has(userId)) {
    walletByUser.set(userId, { ...DEFAULT_WALLET });
  }
  return walletByUser.get(userId);
}

export function setWallet(userId, wallet) {
  walletByUser.set(userId, wallet);
  return wallet;
}

export function getEntitlement(userId, seriesId) {
  if (!entitlementByUser.has(userId)) {
    entitlementByUser.set(userId, new Map());
  }
  const bySeries = entitlementByUser.get(userId);
  if (!bySeries.has(seriesId)) {
    bySeries.set(seriesId, { seriesId, unlockedEpisodeIds: [] });
  }
  return bySeries.get(seriesId);
}

export function getOrders(userId) {
  if (!ordersByUser.has(userId)) {
    ordersByUser.set(userId, []);
  }
  return ordersByUser.get(userId);
}

export function getFollowedSeriesIds(userId) {
  if (!followByUser.has(userId)) {
    followByUser.set(userId, []);
  }
  return followByUser.get(userId);
}

export function setFollowedSeriesIds(userId, ids) {
  const unique = Array.from(new Set(ids));
  followByUser.set(userId, unique);
  return unique;
}

function makeNotificationId(type, seriesId, episodeId) {
  return `${type}_${seriesId || "global"}_${episodeId || "none"}`;
}

function ensurePromoNotification(list) {
  const promoId = makeNotificationId("PROMO", "promo", "first_topup");
  if (list.some((item) => item.id === promoId)) {
    return list;
  }
  return [
    {
      id: promoId,
      type: "PROMO",
      title: "Starter pack bonus",
      message: "First top-up doubles your bonus points.",
      createdAt: new Date().toISOString(),
      read: false,
    },
    ...list,
  ];
}

function ensureSeriesNotifications(list, seriesId) {
  const series = SERIES_CATALOG.find((item) => item.id === seriesId);
  if (!series) {
    return list;
  }
  const episodes = getSeriesEpisodes(seriesId);
  const latestEpisode = episodes[episodes.length - 1];
  if (!latestEpisode) {
    return list;
  }
  const nextList = [...list];
  const latestId = makeNotificationId("NEW_EPISODE", seriesId, latestEpisode.id);
  if (!nextList.some((item) => item.id === latestId)) {
    nextList.unshift({
      id: latestId,
      type: "NEW_EPISODE",
      title: `${series.title} updated`,
      message: `${latestEpisode.title} is now available.`,
      seriesId,
      episodeId: latestEpisode.id,
      createdAt: latestEpisode.releasedAt,
      read: false,
    });
  }
  if (latestEpisode.ttfEligible && latestEpisode.ttfReadyAt) {
    const readyTime = Date.parse(latestEpisode.ttfReadyAt);
    if (!Number.isNaN(readyTime) && readyTime <= Date.now()) {
      const ttfId = makeNotificationId("TTF_READY", seriesId, latestEpisode.id);
      if (!nextList.some((item) => item.id === ttfId)) {
        nextList.unshift({
          id: ttfId,
          type: "TTF_READY",
          title: `${series.title} free claim`,
          message: `${latestEpisode.title} is ready to claim.`,
          seriesId,
          episodeId: latestEpisode.id,
          createdAt: latestEpisode.ttfReadyAt,
          read: false,
        });
      }
    }
  }
  return nextList;
}

export function getNotifications(userId, followedSeriesIds) {
  const list = notificationsByUser.get(userId) || [];
  const filtered = list.filter(
    (item) =>
      item.type === "PROMO" ||
      (item.seriesId && followedSeriesIds.includes(item.seriesId))
  );
  let nextList = filtered;
  followedSeriesIds.forEach((seriesId) => {
    nextList = ensureSeriesNotifications(nextList, seriesId);
  });
  nextList = ensurePromoNotification(nextList);
  notificationsByUser.set(userId, nextList);
  return nextList;
}

export function markNotificationsRead(userId, notificationIds) {
  const list = notificationsByUser.get(userId) || [];
  const idSet = new Set(notificationIds || []);
  const nextList = list.map((item) =>
    idSet.has(item.id) ? { ...item, read: true } : item
  );
  notificationsByUser.set(userId, nextList);
  return nextList;
}

export function addOrder(userId, order) {
  const orders = getOrders(userId);
  const orderId = order.orderId || `ord_${orderCounter++}`;
  const nextOrder = {
    orderId,
    status: "PAID",
    createdAt: new Date().toISOString(),
    ...order,
  };
  orders.unshift(nextOrder);
  return nextOrder;
}

export function unlockEpisode(userId, seriesId, episodeId) {
  const entitlement = getEntitlement(userId, seriesId);
  if (!entitlement.unlockedEpisodeIds.includes(episodeId)) {
    entitlement.unlockedEpisodeIds.push(episodeId);
  }
  return entitlement;
}

export function getEpisodeById(seriesId, episodeId) {
  const episodes = getSeriesEpisodes(seriesId);
  return episodes.find((episode) => episode.id === episodeId) || null;
}

export function chargeWallet(userId, pricePts) {
  const wallet = getWallet(userId);
  const total = (wallet.paidPts || 0) + (wallet.bonusPts || 0);
  const shortfall = pricePts - total;
  if (shortfall > 0) {
    return { ok: false, shortfallPts: shortfall, wallet };
  }

  let paidPts = wallet.paidPts || 0;
  let bonusPts = wallet.bonusPts || 0;
  let remaining = pricePts;

  if (DEDUCT_ORDER === "BONUS_FIRST") {
    const useBonus = Math.min(bonusPts, remaining);
    bonusPts -= useBonus;
    remaining -= useBonus;
    paidPts -= Math.min(paidPts, remaining);
  } else {
    const usePaid = Math.min(paidPts, remaining);
    paidPts -= usePaid;
    remaining -= usePaid;
    bonusPts -= Math.min(bonusPts, remaining);
  }

  const nextWallet = { ...wallet, paidPts, bonusPts };
  setWallet(userId, nextWallet);
  return { ok: true, wallet: nextWallet };
}

export function previewChargeWallet(wallet, pricePts) {
  const total = (wallet.paidPts || 0) + (wallet.bonusPts || 0);
  const shortfall = pricePts - total;
  if (shortfall > 0) {
    return { ok: false, shortfallPts: shortfall };
  }

  let paidPts = wallet.paidPts || 0;
  let bonusPts = wallet.bonusPts || 0;
  let remaining = pricePts;

  if (DEDUCT_ORDER === "BONUS_FIRST") {
    const useBonus = Math.min(bonusPts, remaining);
    bonusPts -= useBonus;
    remaining -= useBonus;
    paidPts -= Math.min(paidPts, remaining);
  } else {
    const usePaid = Math.min(paidPts, remaining);
    paidPts -= usePaid;
    remaining -= usePaid;
    bonusPts -= Math.min(bonusPts, remaining);
  }

  return { ok: true, wallet: { ...wallet, paidPts, bonusPts } };
}

export function setEntitlement(userId, seriesId, entitlement) {
  if (!entitlementByUser.has(userId)) {
    entitlementByUser.set(userId, new Map());
  }
  const bySeries = entitlementByUser.get(userId);
  bySeries.set(seriesId, entitlement);
  return entitlement;
}

export function applyUnlock(entitlement, episodeId) {
  const unlockedEpisodeIds = Array.isArray(entitlement.unlockedEpisodeIds)
    ? [...entitlement.unlockedEpisodeIds]
    : [];
  if (!unlockedEpisodeIds.includes(episodeId)) {
    unlockedEpisodeIds.push(episodeId);
  }
  return { ...entitlement, unlockedEpisodeIds };
}

export function getIdempotencyRecord(userId, key) {
  if (!idempotencyByUser.has(userId)) {
    idempotencyByUser.set(userId, new Map());
  }
  return idempotencyByUser.get(userId).get(key);
}

export function setIdempotencyRecord(userId, key, value) {
  if (!idempotencyByUser.has(userId)) {
    idempotencyByUser.set(userId, new Map());
  }
  idempotencyByUser.get(userId).set(key, value);
}

export function checkRateLimit(userId, action, limit, windowSec) {
  if (!rateLimitByUser.has(userId)) {
    rateLimitByUser.set(userId, new Map());
  }
  const now = Date.now();
  const key = `${action}`;
  const map = rateLimitByUser.get(userId);
  const record = map.get(key) || {
    count: 0,
    resetAt: now + windowSec * 1000,
  };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowSec * 1000;
  }
  if (record.count >= limit) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    map.set(key, record);
    return { ok: false, retryAfterSec };
  }
  record.count += 1;
  map.set(key, record);
  return { ok: true, retryAfterSec: 0 };
}
