import { SERIES_CATALOG } from "./seriesCatalog";
import { getPlan } from "./subscriptions";
import { COUPON_CATALOG } from "./coupons/catalog";

const walletByUser = new Map();
const entitlementByUser = new Map();
const ordersByUser = new Map();
const paymentIntentsByUser = new Map();
const followByUser = new Map();
const notificationsByUser = new Map();
const idempotencyByUser = new Map();
const rateLimitByUser = new Map();
const subscriptionByUser = new Map();
const subscriptionUsageByUser = new Map();
const subscriptionVoucherByUser = new Map();
const couponsByUser = new Map();
const promotionsById = new Map();
const lastSeenByUser = new Map();
const promotionFallback = {
  ctaType: "STORE",
  ctaTarget: "",
  ctaLabel: "View offer",
};
const seriesById = new Map();
const episodesBySeriesId = new Map();
const usersById = new Map();
const usersByEmail = new Map();
const sessionsByToken = new Map();
const progressByUser = new Map();
const bookmarksByUser = new Map();
const historyByUser = new Map();
const searchLogByDay = new Map();
const commentsBySeries = new Map();
const ratingsBySeries = new Map();
let userCounter = 1;
let orderCounter = 1;

const DEFAULT_WALLET = {
  paidPts: 120,
  bonusPts: 20,
  plan: "free",
  subscription: null,
};

const TOPUP_PACKAGES = {
  starter: { packageId: "starter", paidPts: 50, bonusPts: 5, price: 3.99 },
  medium: { packageId: "medium", paidPts: 100, bonusPts: 15, price: 7.99 },
  value: { packageId: "value", paidPts: 200, bonusPts: 40, price: 14.99 },
  mega: { packageId: "mega", paidPts: 500, bonusPts: 120, price: 29.99 },
  premium: { packageId: "premium", paidPts: 300, bonusPts: 60, price: 19.99 },
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

function ensureUserFromCookies(request) {
  const userId = request.cookies?.get("mn_user_id")?.value;
  const email = request.cookies?.get("mn_user_email")?.value;
  if (userId && email && !usersById.has(userId)) {
    const user = { id: userId, email, password: "" };
    usersById.set(userId, user);
    usersByEmail.set(email, user);
  }
  return userId || null;
}

export function getUserIdFromCookies(request) {
  const token = request.cookies?.get("mn_session")?.value;
  if (!token) {
    return null;
  }
  const session = sessionsByToken.get(token);
  return session?.userId || null;
}

export function getSessionUserId(request) {
  const token = request.cookies?.get("mn_session")?.value;
  if (!token) {
    return null;
  }
  const session = sessionsByToken.get(token);
  return session?.userId || null;
}

function generateId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export function createUser(email, password) {
  if (usersByEmail.has(email)) {
    return null;
  }
  const id = `u_${userCounter++}`;
  const user = { id, email, password };
  usersById.set(id, user);
  usersByEmail.set(email, user);
  return user;
}

export function getUserByEmail(email) {
  return usersByEmail.get(email) || null;
}

export function getUserById(userId) {
  return usersById.get(userId) || null;
}

export function validateUser(email, password) {
  const user = usersByEmail.get(email);
  if (!user || user.password !== password) {
    return null;
  }
  return user;
}

export function createSession(userId) {
  const token = generateId("sess");
  sessionsByToken.set(token, { userId, createdAt: Date.now() });
  return token;
}

export function deleteSession(token) {
  sessionsByToken.delete(token);
}

function normalizeRating(value) {
  const rating = Number(value || 0);
  if (Number.isNaN(rating)) {
    return 0;
  }
  return Math.min(5, Math.max(1, rating));
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getNowMs() {
  return Date.now();
}

export function getSubscription(userId) {
  return subscriptionByUser.get(userId) || null;
}

export function hydrateSubscriptionFromCookies(request, userId) {
  if (!request) {
    return getSubscription(userId);
  }
  const existing = getSubscription(userId);
  if (existing) {
    return existing;
  }
  const planId = request.cookies?.get("mn_sub_plan")?.value;
  const active = request.cookies?.get("mn_sub_active")?.value === "1";
  if (!planId || !active) {
    return null;
  }
  const plan = getPlan(planId);
  if (!plan) {
    return null;
  }
  const subscription = {
    active: true,
    planId: plan.id,
    startedAt: new Date().toISOString(),
    renewAt: request.cookies?.get("mn_sub_renew")?.value || "",
    perks: {
      discountPct: plan.discountPct,
      dailyFreeUnlocks: plan.dailyFreeUnlocks,
      ttfMultiplier: plan.ttfMultiplier,
      voucherPts: plan.voucherPts || 0,
    },
  };
  setSubscription(userId, subscription);
  return subscription;
}

export function setSubscription(userId, subscription) {
  if (subscription) {
    subscriptionByUser.set(userId, subscription);
  } else {
    subscriptionByUser.delete(userId);
  }
  const wallet = getWallet(userId);
  const nextWallet = {
    ...wallet,
    plan: subscription?.planId || "free",
    subscription: subscription || null,
  };
  setWallet(userId, nextWallet);
  return subscription;
}

export function getSubscriptionUsage(userId) {
  if (!subscriptionUsageByUser.has(userId)) {
    subscriptionUsageByUser.set(userId, { dateKey: getTodayKey(), used: 0 });
  }
  const usage = subscriptionUsageByUser.get(userId);
  const today = getTodayKey();
  if (usage.dateKey !== today) {
    usage.dateKey = today;
    usage.used = 0;
  }
  return usage;
}

export function markDailyUnlockUsed(userId) {
  const usage = getSubscriptionUsage(userId);
  usage.used += 1;
  return usage;
}

function getSubscriptionVoucherUsage(userId) {
  if (!subscriptionVoucherByUser.has(userId)) {
    subscriptionVoucherByUser.set(userId, { dateKey: getTodayKey(), used: false });
  }
  const usage = subscriptionVoucherByUser.get(userId);
  const today = getTodayKey();
  if (usage.dateKey !== today) {
    usage.dateKey = today;
    usage.used = false;
  }
  return usage;
}

export function markSubscriptionVoucherUsed(userId) {
  const usage = getSubscriptionVoucherUsage(userId);
  usage.used = true;
  return usage;
}

export function getSubscriptionVoucher(userId, subscription) {
  if (!subscription?.active || !subscription?.perks?.voucherPts) {
    return null;
  }
  const usage = getSubscriptionVoucherUsage(userId);
  if (usage.used) {
    return null;
  }
  const value = Number(subscription.perks.voucherPts || 0);
  if (!value) {
    return null;
  }
  return {
    id: `SUB_VOUCHER_${subscription.planId}`,
    code: `SUB${value}`,
    type: "DISCOUNT_PTS",
    value,
    remainingUses: 1,
    label: `Subscriber ${value} POINTS`,
    source: "subscription",
  };
}

export function getCoupons(userId) {
  if (!couponsByUser.has(userId)) {
    couponsByUser.set(userId, []);
  }
  return couponsByUser.get(userId);
}

export function setCoupons(userId, coupons) {
  couponsByUser.set(userId, coupons);
  return coupons;
}

export function addCoupon(userId, coupon) {
  const list = getCoupons(userId);
  list.push(coupon);
  return coupon;
}

export function consumeCoupon(userId, couponId) {
  const list = getCoupons(userId);
  const next = list
    .map((coupon) => {
      if (coupon.id !== couponId) {
        return coupon;
      }
      const remaining = Math.max(0, (coupon.remainingUses || 1) - 1);
      return { ...coupon, remainingUses: remaining };
    })
    .filter((coupon) => (coupon.remainingUses ?? 1) > 0);
  setCoupons(userId, next);
  return next;
}

export function hydrateCouponsFromCookies(request, userId) {
  if (!request) {
    return getCoupons(userId);
  }
  const existing = getCoupons(userId);
  if (existing.length > 0) {
    return existing;
  }
  const raw = request.cookies?.get("mn_coupon_codes")?.value || "";
  if (!raw) {
    return existing;
  }
  const codes = raw.split(",").map((code) => code.trim()).filter(Boolean);
  const hydrated = codes
    .map((code) => COUPON_CATALOG[code])
    .filter(Boolean)
    .map((coupon) => ({ ...coupon, claimedAt: new Date().toISOString() }));
  setCoupons(userId, hydrated);
  return hydrated;
}

function normalizePromotion(input) {
  const coupon = input.coupon || {};
  return {
    id: input.id,
    title: input.title || "Promotion",
    description: input.description || "",
    type: input.type || "HOLIDAY",
    segment: input.segment || "all",
    active: Boolean(input.active),
    startAt: input.startAt || "",
    endAt: input.endAt || "",
    bonusMultiplier: Number(input.bonusMultiplier || 0),
    returningAfterDays: Number(input.returningAfterDays || 7),
    autoGrant: Boolean(input.autoGrant),
    ctaType: input.ctaType || "STORE",
    ctaTarget: input.ctaTarget || "",
    ctaLabel: input.ctaLabel || "",
    coupon: coupon.code
      ? {
          id: coupon.id || coupon.code,
          code: coupon.code,
          type: coupon.type || "DISCOUNT_PCT",
          value: Number(coupon.value || 0),
          remainingUses: Number(coupon.remainingUses || 1),
          label: coupon.label || coupon.code,
        }
      : null,
  };
}

function ensurePromotions() {
  if (promotionsById.size > 0) {
    return;
  }
  [
    {
      id: "promo_first_purchase",
      title: "First purchase bonus",
      type: "FIRST_PURCHASE",
      segment: "first_purchase",
      active: true,
      bonusMultiplier: 2,
      autoGrant: false,
      ctaType: "STORE",
      ctaLabel: "Shop packs",
      description: "Double bonus POINTS for your first purchase.",
    },
    {
      id: "promo_holiday",
      title: "Holiday deal",
      type: "HOLIDAY",
      segment: "all",
      active: true,
      autoGrant: true,
      ctaType: "STORE",
      ctaLabel: "Unlock now",
      coupon: {
        code: "HOLIDAY10",
        type: "DISCOUNT_PCT",
        value: 10,
        remainingUses: 1,
        label: "Holiday 10% OFF",
      },
      description: "Limited-time discount for your next unlock.",
    },
    {
      id: "promo_returning",
      title: "Welcome back",
      type: "RETURNING",
      segment: "returning",
      active: true,
      autoGrant: true,
      returningAfterDays: 7,
      ctaType: "STORE",
      ctaLabel: "Claim reward",
      coupon: {
        code: "RETURN5",
        type: "DISCOUNT_PTS",
        value: 5,
        remainingUses: 1,
        label: "Welcome back 5 POINTS",
      },
      description: "Claim your welcome back bonus and keep reading.",
    },
    {
      id: "promo_sub_voucher",
      title: "Subscriber voucher ready",
      type: "SUB_VOUCHER",
      segment: "subscriber",
      active: true,
      autoGrant: false,
      ctaType: "STORE",
      ctaLabel: "Use voucher",
      description: "Your daily subscriber voucher is available.",
    },
  ].forEach((promo) => {
    promotionsById.set(promo.id, normalizePromotion(promo));
  });
}

export function getPromotions() {
  ensurePromotions();
  return Array.from(promotionsById.values());
}

export function getPromotionFallback() {
  return { ...promotionFallback };
}

export function setPromotionFallback(next) {
  if (!next) {
    return getPromotionFallback();
  }
  promotionFallback.ctaType = next.ctaType || promotionFallback.ctaType;
  promotionFallback.ctaTarget = next.ctaTarget || "";
  promotionFallback.ctaLabel = next.ctaLabel || promotionFallback.ctaLabel;
  return getPromotionFallback();
}

export function getPromotionById(promoId) {
  ensurePromotions();
  return promotionsById.get(promoId) || null;
}

export function setPromotion(promoId, input) {
  ensurePromotions();
  const normalized = normalizePromotion({ ...input, id: promoId });
  promotionsById.set(promoId, normalized);
  return normalized;
}

export function deletePromotion(promoId) {
  ensurePromotions();
  promotionsById.delete(promoId);
}

export function getUserSegments(userId) {
  const lastSeenAt = lastSeenByUser.get(userId) || 0;
  const daysSinceLastSeen =
    lastSeenAt > 0 ? (getNowMs() - lastSeenAt) / (24 * 60 * 60 * 1000) : 0;
  const isReturning = lastSeenAt > 0 && daysSinceLastSeen >= 7;
  const hasPurchased = getOrders(userId).length > 0;
  lastSeenByUser.set(userId, getNowMs());
  return {
    isNewPayer: !hasPurchased,
    isReturning,
    daysSinceLastSeen,
    lastSeenAt,
  };
}

function isPromotionActive(promo, nowMs) {
  if (!promo.active) {
    return false;
  }
  if (promo.startAt) {
    const start = Date.parse(promo.startAt);
    if (!Number.isNaN(start) && nowMs < start) {
      return false;
    }
  }
  if (promo.endAt) {
    const end = Date.parse(promo.endAt);
    if (!Number.isNaN(end) && nowMs > end) {
      return false;
    }
  }
  return true;
}

function resolvePromotionCta(promo, fallback) {
  const ctaType = promo?.ctaType || fallback?.ctaType || "STORE";
  const ctaTarget = promo?.ctaTarget || "";
  const ctaLabel = promo?.ctaLabel || fallback?.ctaLabel || "";
  const requiresTarget = ["SERIES", "READ", "URL"].includes(ctaType);
  if (requiresTarget && !ctaTarget) {
    return {
      ctaType: fallback?.ctaType || "STORE",
      ctaTarget: fallback?.ctaTarget || "",
      ctaLabel: fallback?.ctaLabel || "",
    };
  }
  return { ctaType, ctaTarget, ctaLabel };
}

export function getActivePromotions(userId) {
  ensurePromotions();
  const segments = getUserSegments(userId);
  const subscription = getSubscription(userId);
  const nowMs = getNowMs();
  return getPromotions().filter((promo) => {
    if (!isPromotionActive(promo, nowMs)) {
      return false;
    }
    if (promo.segment === "first_purchase") {
      return segments.isNewPayer;
    }
    if (promo.segment === "returning") {
      const threshold = Number(promo.returningAfterDays || 7);
      return segments.lastSeenAt > 0 && segments.daysSinceLastSeen >= threshold;
    }
    if (promo.segment === "subscriber") {
      return Boolean(subscription?.active);
    }
    return true;
  });
}

export function grantPromotionCoupons(userId, promotions) {
  const current = getCoupons(userId);
  const existingCodes = new Set(current.map((item) => item.code));
  let changed = false;
  promotions.forEach((promo) => {
    if (!promo.autoGrant || !promo.coupon?.code) {
      return;
    }
    const code = promo.coupon.code;
    if (existingCodes.has(code)) {
      return;
    }
    addCoupon(userId, { ...promo.coupon, claimedAt: new Date().toISOString() });
    existingCodes.add(code);
    changed = true;
  });
  return { coupons: getCoupons(userId), changed };
}

export function getAvailableCoupons(userId, subscription, promotions) {
  const baseCoupons = getCoupons(userId);
  const subscriberCoupon = getSubscriptionVoucher(userId, subscription);
  const promoCoupons = Array.isArray(promotions)
    ? promotions
        .filter((promo) => promo.autoGrant)
        .map((promo) => promo.coupon)
        .filter(Boolean)
    : [];
  const list = [...baseCoupons];
  promoCoupons.forEach((coupon) => {
    if (!list.some((item) => item.code === coupon.code)) {
      list.push({ ...coupon, source: "promotion" });
    }
  });
  if (subscriberCoupon) {
    list.push(subscriberCoupon);
  }
  return list;
}

export function getCouponDefinition(userId, code) {
  if (!code) {
    return null;
  }
  const upper = String(code).toUpperCase();
  const base = COUPON_CATALOG[upper];
  if (base) {
    return base;
  }
  const promos = getActivePromotions(userId);
  const promo = promos.find((item) => item.coupon?.code === upper);
  return promo?.coupon || null;
}
export function getComments(seriesId) {
  if (!commentsBySeries.has(seriesId)) {
    commentsBySeries.set(seriesId, []);
  }
  return commentsBySeries.get(seriesId);
}

export function addComment(seriesId, userId, text) {
  const comments = getComments(seriesId);
  const user = getUserById(userId);
  const comment = {
    id: `c_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    seriesId,
    userId,
    author: user?.email || "Guest",
    text,
    createdAt: new Date().toISOString(),
    likes: [],
    replies: [],
  };
  comments.unshift(comment);
  return comment;
}

export function addCommentReply(seriesId, commentId, userId, text) {
  const comments = getComments(seriesId);
  const comment = comments.find((item) => item.id === commentId);
  if (!comment) {
    return null;
  }
  const user = getUserById(userId);
  if (!Array.isArray(comment.replies)) {
    comment.replies = [];
  }
  const reply = {
    id: `r_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    userId,
    author: user?.email || "Guest",
    text,
    createdAt: new Date().toISOString(),
  };
  comment.replies.push(reply);
  return comment;
}

export function toggleCommentLike(seriesId, commentId, userId) {
  const comments = getComments(seriesId);
  const comment = comments.find((item) => item.id === commentId);
  if (!comment) {
    return null;
  }
  if (!Array.isArray(comment.likes)) {
    comment.likes = [];
  }
  if (comment.likes.includes(userId)) {
    comment.likes = comment.likes.filter((id) => id !== userId);
  } else {
    comment.likes.push(userId);
  }
  return comment;
}

export function getRatingStats(seriesId) {
  if (!ratingsBySeries.has(seriesId)) {
    ratingsBySeries.set(seriesId, new Map());
  }
  const ratings = ratingsBySeries.get(seriesId);
  const values = Array.from(ratings.values());
  const count = values.length;
  const avg = count === 0 ? 0 : values.reduce((sum, val) => sum + val, 0) / count;
  return {
    rating: Number(avg.toFixed(2)),
    count,
  };
}

export function setRating(seriesId, userId, value) {
  if (!ratingsBySeries.has(seriesId)) {
    ratingsBySeries.set(seriesId, new Map());
  }
  const rating = normalizeRating(value);
  ratingsBySeries.get(seriesId).set(userId, rating);
  const stats = getRatingStats(seriesId);
  const series = getSeriesById(seriesId);
  if (series) {
    series.rating = stats.rating;
  }
  return stats;
}

export function getProgress(userId) {
  if (!progressByUser.has(userId)) {
    progressByUser.set(userId, {});
  }
  return progressByUser.get(userId);
}

export function updateProgress(userId, seriesId, payload) {
  const progress = getProgress(userId);
  progress[seriesId] = {
    lastEpisodeId: payload.lastEpisodeId,
    percent: payload.percent,
    updatedAt: payload.updatedAt || Date.now(),
  };
  return progress;
}

export function getBookmarks(userId) {
  if (!bookmarksByUser.has(userId)) {
    bookmarksByUser.set(userId, {});
  }
  return bookmarksByUser.get(userId);
}

export function setBookmarks(userId, next) {
  bookmarksByUser.set(userId, next || {});
  return getBookmarks(userId);
}

export function addBookmark(userId, seriesId, entry) {
  const store = getBookmarks(userId);
  const list = Array.isArray(store[seriesId]) ? store[seriesId] : [];
  const bookmark = {
    id: entry.id || `bm_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    seriesId,
    episodeId: entry.episodeId,
    percent: entry.percent || 0,
    pageIndex: entry.pageIndex || 0,
    label: entry.label || "Bookmark",
    createdAt: entry.createdAt || new Date().toISOString(),
  };
  const nextList = [bookmark, ...list.filter((item) => item.id !== bookmark.id)].slice(0, 50);
  const next = { ...store, [seriesId]: nextList };
  return setBookmarks(userId, next);
}

export function removeBookmark(userId, seriesId, bookmarkId) {
  const store = getBookmarks(userId);
  const list = Array.isArray(store[seriesId]) ? store[seriesId] : [];
  const nextList = list.filter((item) => item.id !== bookmarkId);
  const next = { ...store, [seriesId]: nextList };
  return setBookmarks(userId, next);
}

export function getReadingHistory(userId) {
  if (!historyByUser.has(userId)) {
    historyByUser.set(userId, []);
  }
  return historyByUser.get(userId);
}

export function addReadingHistory(userId, entry) {
  const list = getReadingHistory(userId);
  const nextEntry = {
    id: entry.id || `rh_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    seriesId: entry.seriesId,
    episodeId: entry.episodeId,
    title: entry.title || "",
    percent: entry.percent || 0,
    createdAt: entry.createdAt || new Date().toISOString(),
  };
  const filtered = list.filter(
    (item) => !(item.seriesId === nextEntry.seriesId && item.episodeId === nextEntry.episodeId)
  );
  const next = [nextEntry, ...filtered].slice(0, 100);
  historyByUser.set(userId, next);
  return next;
}

export function recordSearchQuery(userId, query) {
  const keyword = String(query || "").trim();
  if (!keyword) {
    return;
  }
  const day = getTodayKey();
  if (!searchLogByDay.has(day)) {
    searchLogByDay.set(day, new Map());
  }
  const map = searchLogByDay.get(day);
  map.set(keyword, (map.get(keyword) || 0) + 1);
}

export function getHotSearchKeywords(limit = 8) {
  const day = getTodayKey();
  const map = searchLogByDay.get(day) || new Map();
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

export function getSearchSuggestions(query, seriesList, limit = 8) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) {
    return [];
  }
  const list = Array.isArray(seriesList) ? seriesList : getSeriesList();
  const hits = [];
  list.forEach((series) => {
    if (series.title && String(series.title).toLowerCase().includes(q)) {
      hits.push(series.title);
    }
    (series.genres || []).forEach((genre) => {
      if (String(genre).toLowerCase().includes(q)) {
        hits.push(genre);
      }
    });
  });
  const hot = getHotSearchKeywords(limit * 2).filter((item) =>
    String(item).toLowerCase().includes(q)
  );
  return Array.from(new Set([...hits, ...hot])).slice(0, limit);
}

function normalizeSeries(input) {
  const pricing = input.pricing || {};
  const ttf = input.ttf || {};
  return {
    id: input.id,
    title: input.title || "Untitled",
    type: input.type || "comic",
    adult: Boolean(input.adult),
    genres: Array.isArray(input.genres) ? input.genres : [],
    status: input.status || "Ongoing",
    rating: Number(input.rating || 0),
    description: input.description || "",
    badge: input.badge || "",
    coverTone: input.coverTone || "warm",
    coverUrl: input.coverUrl || "",
    pricing: {
      currency: pricing.currency || "POINTS",
      episodePrice: Number(pricing.episodePrice || 5),
      discount: Number(pricing.discount || 0),
    },
    ttf: {
      enabled: Boolean(ttf.enabled),
      intervalHours: Number(ttf.intervalHours || 24),
    },
    latestEpisodeId: input.latestEpisodeId || "",
  };
}

function normalizeEpisode(seriesId, input) {
  const number = Number(input.number || 1);
  return {
    id: input.id || `${seriesId}e${number}`,
    seriesId,
    number,
    title: input.title || `Episode ${number}`,
    releasedAt: input.releasedAt || new Date().toISOString(),
    pricePts: Number(input.pricePts || 0),
    ttfEligible: Boolean(input.ttfEligible),
    ttfReadyAt: input.ttfReadyAt || null,
    previewFreePages: Number(input.previewFreePages || 0),
  };
}

function ensureSeriesStore() {
  if (seriesById.size > 0) {
    return;
  }
  SERIES_CATALOG.forEach((item) => {
    const series = normalizeSeries(item);
    const latestNumber = parseLatestNumber(item.latest);
    const episodes = buildEpisodes(series.id, latestNumber, series.pricing.episodePrice);
    const latestEpisode = episodes[episodes.length - 1];
    series.latestEpisodeId = latestEpisode ? latestEpisode.id : "";
    seriesById.set(series.id, series);
    episodesBySeriesId.set(series.id, episodes);
  });
}

export function getSeriesList() {
  ensureSeriesStore();
  return Array.from(seriesById.values());
}

export function getSearchKeywords(seriesList) {
  const list = Array.isArray(seriesList) ? seriesList : getSeriesList();
  const genreCounts = new Map();
  list.forEach((series) => {
    (series.genres || []).forEach((item) => {
      const key = String(item);
      genreCounts.set(key, (genreCounts.get(key) || 0) + 1);
    });
  });
  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([genre]) => genre);
  const topTitles = list.slice(0, 4).map((series) => series.title);
  const combined = [...topGenres, ...topTitles].filter(Boolean);
  return Array.from(new Set(combined)).slice(0, 10);
}

export function getSeriesById(seriesId) {
  ensureSeriesStore();
  return seriesById.get(seriesId) || null;
}

export function setSeries(seriesId, input) {
  ensureSeriesStore();
  const series = normalizeSeries({ ...input, id: seriesId });
  const existingEpisodes = episodesBySeriesId.get(seriesId) || [];
  if (existingEpisodes.length > 0) {
    const latestEpisode = existingEpisodes[existingEpisodes.length - 1];
    series.latestEpisodeId = latestEpisode?.id || series.latestEpisodeId;
  }
  seriesById.set(seriesId, series);
  if (!episodesBySeriesId.has(seriesId)) {
    episodesBySeriesId.set(seriesId, []);
  }
  return series;
}

export function deleteSeries(seriesId) {
  ensureSeriesStore();
  seriesById.delete(seriesId);
  episodesBySeriesId.delete(seriesId);
}

export function setSeriesEpisodes(seriesId, episodes) {
  ensureSeriesStore();
  const normalized = (episodes || []).map((episode) =>
    normalizeEpisode(seriesId, episode)
  );
  normalized.sort((a, b) => a.number - b.number);
  episodesBySeriesId.set(seriesId, normalized);
  const series = seriesById.get(seriesId);
  if (series) {
    const latestEpisode = normalized[normalized.length - 1];
    series.latestEpisodeId = latestEpisode ? latestEpisode.id : "";
  }
  return normalized;
}

export function upsertEpisode(seriesId, input) {
  ensureSeriesStore();
  const list = episodesBySeriesId.get(seriesId) || [];
  const normalized = normalizeEpisode(seriesId, input);
  const index = list.findIndex((episode) => episode.id === normalized.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...normalized };
  } else {
    list.push(normalized);
  }
  list.sort((a, b) => a.number - b.number);
  episodesBySeriesId.set(seriesId, list);
  const series = seriesById.get(seriesId);
  if (series) {
    const latestEpisode = list[list.length - 1];
    series.latestEpisodeId = latestEpisode ? latestEpisode.id : "";
  }
  return normalized;
}

export function deleteEpisode(seriesId, episodeId) {
  ensureSeriesStore();
  const list = episodesBySeriesId.get(seriesId) || [];
  const next = list.filter((episode) => episode.id !== episodeId);
  episodesBySeriesId.set(seriesId, next);
  const series = seriesById.get(seriesId);
  if (series) {
    const latestEpisode = next[next.length - 1];
    series.latestEpisodeId = latestEpisode ? latestEpisode.id : "";
  }
  return next;
}

export function bulkGenerateEpisodes(seriesId, count, baseProps = {}) {
  ensureSeriesStore();
  const series = seriesById.get(seriesId);
  const pricePts = Number(baseProps.pricePts || series?.pricing?.episodePrice || 0);
  const latestNumber = Number(count || 0);
  const episodes = buildEpisodes(seriesId, latestNumber, pricePts).map((episode) => ({
    ...episode,
    ttfEligible:
      baseProps.ttfEligible === undefined ? episode.ttfEligible : baseProps.ttfEligible,
    previewFreePages:
      baseProps.previewFreePages === undefined
        ? episode.previewFreePages
        : baseProps.previewFreePages,
  }));
  return setSeriesEpisodes(seriesId, episodes);
}

export function getSeriesEpisodes(seriesId) {
  ensureSeriesStore();
  return episodesBySeriesId.get(seriesId) || [];
}

function applyTtfAccelerationToEpisode(episode, series, subscription) {
  if (!episode.ttfEligible || !episode.ttfReadyAt) {
    return episode;
  }
  const multiplier = subscription?.perks?.ttfMultiplier;
  if (!multiplier || multiplier >= 1) {
    return episode;
  }
  const releasedAtMs = Date.parse(episode.releasedAt);
  if (Number.isNaN(releasedAtMs)) {
    return episode;
  }
  const intervalHours = series?.ttf?.intervalHours || 24;
  const baseReadyAtMs = releasedAtMs + intervalHours * 60 * 60 * 1000;
  const acceleratedReadyAtMs =
    releasedAtMs + intervalHours * multiplier * 60 * 60 * 1000;
  const originalReadyAtMs = Date.parse(episode.ttfReadyAt);
  const targetReadyAtMs = Number.isNaN(originalReadyAtMs)
    ? Math.min(baseReadyAtMs, acceleratedReadyAtMs)
    : Math.min(originalReadyAtMs, acceleratedReadyAtMs);
  if (!Number.isFinite(targetReadyAtMs)) {
    return episode;
  }
  return {
    ...episode,
    ttfReadyAt: new Date(targetReadyAtMs).toISOString(),
  };
}

export function getSeriesEpisodesForUser(seriesId, subscription) {
  const episodes = getSeriesEpisodes(seriesId);
  if (!subscription?.active) {
    return episodes;
  }
  const series = getSeriesById(seriesId);
  return episodes.map((episode) =>
    applyTtfAccelerationToEpisode(episode, series, subscription)
  );
}

export function getWallet(userId) {
  if (!walletByUser.has(userId)) {
    walletByUser.set(userId, { ...DEFAULT_WALLET });
  }
  return walletByUser.get(userId);
}

export function buildWalletSnapshot(userId, wallet, subscription) {
  const activeSub = subscription?.active
    ? subscription
    : getSubscription(userId) || wallet?.subscription || null;
  const usage = activeSub?.active ? getSubscriptionUsage(userId) : null;
  const dailyLimit = activeSub?.perks?.dailyFreeUnlocks || 0;
  const remaining = usage ? Math.max(0, dailyLimit - usage.used) : 0;
  const voucher = getSubscriptionVoucher(userId, activeSub);
  return {
    ...wallet,
    plan: activeSub?.planId || wallet?.plan || "free",
    subscription: activeSub || null,
    subscriptionUsage: usage
      ? {
          used: usage.used,
          remaining,
          dateKey: usage.dateKey,
          dailyFreeUnlocks: dailyLimit,
        }
      : null,
    subscriptionVoucher: voucher ? { ...voucher } : null,
  };
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

function getPaymentIntents(userId) {
  if (!paymentIntentsByUser.has(userId)) {
    paymentIntentsByUser.set(userId, new Map());
  }
  return paymentIntentsByUser.get(userId);
}

export function getTopupPackage(packageId) {
  if (!packageId) {
    return null;
  }
  const key = String(packageId).toLowerCase();
  return TOPUP_PACKAGES[key] || null;
}

export function createPaymentIntent(userId, packageId, provider = "stripe") {
  const pkg = getTopupPackage(packageId);
  if (!pkg) {
    return null;
  }
  const order = addOrder(userId, {
    packageId: pkg.packageId,
    amount: pkg.price,
    currency: "USD",
    status: "PENDING",
    provider,
    paidPts: pkg.paidPts,
    bonusPts: pkg.bonusPts,
  });
  const paymentId = generateId("pay");
  const intent = {
    paymentId,
    orderId: order.orderId,
    provider,
    status: "AUTHORIZED",
    createdAt: new Date().toISOString(),
  };
  getPaymentIntents(userId).set(paymentId, intent);
  return { intent, order };
}

export function confirmPaymentIntent(userId, paymentId) {
  const intents = getPaymentIntents(userId);
  const intent = intents.get(paymentId);
  if (!intent) {
    return { ok: false, error: "PAYMENT_NOT_FOUND" };
  }
  const orders = getOrders(userId);
  const order = orders.find((item) => item.orderId === intent.orderId);
  if (!order) {
    return { ok: false, error: "ORDER_NOT_FOUND" };
  }
  if (order.status === "PAID") {
    return { ok: true, order, wallet: getWallet(userId) };
  }
  const promotions = getActivePromotions(userId);
  const firstPurchasePromo = promotions.find(
    (promo) => promo.type === "FIRST_PURCHASE"
  );
  const bonusMultiplier = firstPurchasePromo?.bonusMultiplier || 1;
  const bonusGranted = Math.round((order.bonusPts || 0) * bonusMultiplier);
  const wallet = getWallet(userId);
  const nextWallet = {
    ...wallet,
    paidPts: (wallet.paidPts || 0) + (order.paidPts || 0),
    bonusPts: (wallet.bonusPts || 0) + bonusGranted,
  };
  order.status = "PAID";
  order.paidAt = new Date().toISOString();
  order.bonusGranted = bonusGranted;
  setWallet(userId, nextWallet);
  intent.status = "CAPTURED";
  return { ok: true, order, wallet: nextWallet, promotionApplied: firstPurchasePromo?.id || null };
}

export function updateOrderStatus(userId, orderId, status, payload = {}) {
  const orders = getOrders(userId);
  const order = orders.find((item) => item.orderId === orderId);
  if (!order) {
    return { ok: false, error: "ORDER_NOT_FOUND" };
  }
  order.status = status;
  if (payload.reason) {
    order.reason = payload.reason;
  }
  if (status === "FAILED") {
    order.failedAt = new Date().toISOString();
  }
  if (status === "DISPUTED") {
    order.disputedAt = new Date().toISOString();
  }
  if (status === "CHARGEBACK") {
    order.chargebackAt = new Date().toISOString();
  }
  return { ok: true, order };
}

export function applyChargeback(userId, orderId, reason = "") {
  const orders = getOrders(userId);
  const order = orders.find((item) => item.orderId === orderId);
  if (!order) {
    return { ok: false, error: "ORDER_NOT_FOUND" };
  }
  if (order.status === "CHARGEBACK") {
    return { ok: true, order, wallet: getWallet(userId) };
  }
  const wallet = getWallet(userId);
  const total = (order.paidPts || 0) + (order.bonusGranted || order.bonusPts || 0);
  const nextWallet = {
    ...wallet,
    paidPts: Math.max(0, (wallet.paidPts || 0) - Math.min(wallet.paidPts || 0, total)),
    bonusPts: Math.max(0, (wallet.bonusPts || 0) - Math.max(0, total - (wallet.paidPts || 0))),
  };
  order.status = "CHARGEBACK";
  order.reason = reason || "chargeback";
  order.chargebackAt = new Date().toISOString();
  setWallet(userId, nextWallet);
  return { ok: true, order, wallet: nextWallet };
}

export function refundOrder(userId, orderId) {
  const orders = getOrders(userId);
  const order = orders.find((item) => item.orderId === orderId);
  if (!order) {
    return { ok: false, error: "ORDER_NOT_FOUND" };
  }
  if (order.status !== "PAID") {
    return { ok: false, error: "ORDER_NOT_PAID" };
  }
  const wallet = getWallet(userId);
  const refundPts = (order.paidPts || 0) + (order.bonusGranted || 0);
  let paidPts = wallet.paidPts || 0;
  let bonusPts = wallet.bonusPts || 0;
  let remaining = refundPts;
  const refundFromBonus = Math.min(bonusPts, remaining);
  bonusPts -= refundFromBonus;
  remaining -= refundFromBonus;
  const refundFromPaid = Math.min(paidPts, remaining);
  paidPts -= refundFromPaid;
  remaining -= refundFromPaid;
  const nextWallet = { ...wallet, paidPts, bonusPts };
  order.status = "REFUNDED";
  order.refundedAt = new Date().toISOString();
  setWallet(userId, nextWallet);
  return { ok: true, order, wallet: nextWallet, refundShortfall: remaining };
}

export function reconcileOrders(userId) {
  const orders = getOrders(userId);
  const now = Date.now();
  let updated = 0;
  orders.forEach((order) => {
    if (order.status === "PENDING") {
      const created = Date.parse(order.createdAt);
      if (!Number.isNaN(created) && now - created > 15 * 60 * 1000) {
        order.status = "FAILED";
        order.failedAt = new Date().toISOString();
        updated += 1;
      }
    }
  });
  return { updated, orders };
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

function ensurePromotionNotifications(list, promotions) {
  const next = [...list];
  const fallback = getPromotionFallback();
  promotions.forEach((promo) => {
    const promoId = makeNotificationId("PROMO", "promo", promo.id);
    if (next.some((item) => item.id === promoId)) {
      return;
    }
    const returningHint =
      promo.segment === "returning"
        ? ` Returning after ${promo.returningAfterDays || 7} days.`
        : "";
    const expiresAt = promo.endAt || "";
    next.unshift({
      id: promoId,
      type: "PROMO",
      title: promo.title || "Promotion",
      message: `${promo.description || promo.title || "Limited-time offer."}${returningHint}`,
      createdAt: new Date().toISOString(),
      expiresAt,
      read: false,
      promoId: promo.id,
      ...resolvePromotionCta(promo, fallback),
    });
  });
  return next;
}

function ensureVoucherNotification(list, subscription, voucher, promo) {
  if (!subscription?.active || !voucher) {
    return list;
  }
  const voucherId = makeNotificationId("SUB_VOUCHER", "subscription", voucher.id);
  if (list.some((item) => item.id === voucherId)) {
    return list;
  }
  const fallback = getPromotionFallback();
  const title = promo?.title || "Subscriber voucher ready";
  const message = promo?.description || `${voucher.label} is available today.`;
  return [
    {
      id: voucherId,
      type: "SUB_VOUCHER",
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false,
      ...resolvePromotionCta(promo || {}, fallback),
    },
    ...list,
  ];
}

function ensureSeriesNotifications(list, seriesId, subscription) {
  const series = getSeriesById(seriesId);
  if (!series) {
    return list;
  }
  const episodes = getSeriesEpisodesForUser(seriesId, subscription);
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
  const promotions = getActivePromotions(userId);
  const subscription = getSubscription(userId);
  const filtered = list.filter(
    (item) =>
      item.type === "PROMO" ||
      item.type === "SUB_VOUCHER" ||
      (item.seriesId && followedSeriesIds.includes(item.seriesId))
  );
  let nextList = filtered;
  followedSeriesIds.forEach((seriesId) => {
    nextList = ensureSeriesNotifications(nextList, seriesId, subscription);
  });
  nextList = ensurePromotionNotifications(nextList, promotions);
  const voucher = getSubscriptionVoucher(userId, subscription);
  const voucherPromo = promotions.find((promo) => promo.type === "SUB_VOUCHER");
  nextList = ensureVoucherNotification(nextList, subscription, voucher, voucherPromo);
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
    status: order.status || "PAID",
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
