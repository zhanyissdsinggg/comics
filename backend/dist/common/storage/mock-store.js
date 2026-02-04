"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seriesCatalog = void 0;
exports.createId = createId;
exports.createUser = createUser;
exports.getAllUserIds = getAllUserIds;
exports.getAllUsers = getAllUsers;
exports.validateUser = validateUser;
exports.getUserById = getUserById;
exports.setUserBlocked = setUserBlocked;
exports.createSession = createSession;
exports.deleteSession = deleteSession;
exports.getSessionUserId = getSessionUserId;
exports.getSeriesList = getSeriesList;
exports.getSeriesById = getSeriesById;
exports.getSeriesEpisodes = getSeriesEpisodes;
exports.getSeriesEpisodesForUser = getSeriesEpisodesForUser;
exports.setSeries = setSeries;
exports.deleteSeries = deleteSeries;
exports.setSeriesEpisodes = setSeriesEpisodes;
exports.upsertEpisode = upsertEpisode;
exports.deleteEpisode = deleteEpisode;
exports.bulkGenerateEpisodes = bulkGenerateEpisodes;
exports.getEpisodeById = getEpisodeById;
exports.getWallet = getWallet;
exports.setWallet = setWallet;
exports.chargeWallet = chargeWallet;
exports.getEntitlement = getEntitlement;
exports.setEntitlement = setEntitlement;
exports.applyUnlock = applyUnlock;
exports.addOrder = addOrder;
exports.getOrders = getOrders;
exports.getAllOrders = getAllOrders;
exports.adjustWallet = adjustWallet;
exports.getTopupPackage = getTopupPackage;
exports.createPaymentIntent = createPaymentIntent;
exports.confirmPaymentIntent = confirmPaymentIntent;
exports.refundOrder = refundOrder;
exports.updateOrderStatus = updateOrderStatus;
exports.applyChargeback = applyChargeback;
exports.reconcileOrders = reconcileOrders;
exports.getFollowedSeriesIds = getFollowedSeriesIds;
exports.setFollowedSeriesIds = setFollowedSeriesIds;
exports.getNotifications = getNotifications;
exports.addNotification = addNotification;
exports.getAllNotifications = getAllNotifications;
exports.markNotificationsRead = markNotificationsRead;
exports.getComments = getComments;
exports.addComment = addComment;
exports.getAllComments = getAllComments;
exports.setCommentHidden = setCommentHidden;
exports.recalcSeriesRating = recalcSeriesRating;
exports.addCommentReply = addCommentReply;
exports.toggleCommentLike = toggleCommentLike;
exports.getRatingStats = getRatingStats;
exports.setRating = setRating;
exports.getProgress = getProgress;
exports.updateProgress = updateProgress;
exports.getBookmarks = getBookmarks;
exports.addBookmark = addBookmark;
exports.removeBookmark = removeBookmark;
exports.getReadingHistory = getReadingHistory;
exports.addReadingHistory = addReadingHistory;
exports.recordSearchQuery = recordSearchQuery;
exports.getHotSearchKeywords = getHotSearchKeywords;
exports.getSearchSuggestions = getSearchSuggestions;
exports.getCoupons = getCoupons;
exports.claimCoupon = claimCoupon;
exports.getPromotions = getPromotions;
exports.getPromotionFallback = getPromotionFallback;
exports.setPromotionFallback = setPromotionFallback;
exports.getPromotionById = getPromotionById;
exports.setPromotion = setPromotion;
exports.deletePromotion = deletePromotion;
exports.getSubscription = getSubscription;
exports.setSubscription = setSubscription;
exports.getSubscriptionUsage = getSubscriptionUsage;
exports.markDailyUnlockUsed = markDailyUnlockUsed;
exports.markSubscriptionVoucherUsed = markSubscriptionVoucherUsed;
exports.getSubscriptionVoucher = getSubscriptionVoucher;
exports.buildWalletSnapshot = buildWalletSnapshot;
exports.getRewardsState = getRewardsState;
exports.checkIn = checkIn;
exports.makeUpCheckIn = makeUpCheckIn;
exports.getMissionState = getMissionState;
exports.reportMissionEvent = reportMissionEvent;
exports.claimMission = claimMission;
exports.getCouponCatalog = getCouponCatalog;
exports.getPlanCatalog = getPlanCatalog;
exports.getIdempotencyRecord = getIdempotencyRecord;
exports.setIdempotencyRecord = setIdempotencyRecord;
exports.checkRateLimit = checkRateLimit;
exports.recordRegistration = recordRegistration;
exports.recordComicView = recordComicView;
exports.recordSeriesView = recordSeriesView;
exports.recordDailyActive = recordDailyActive;
exports.getDailyStats = getDailyStats;
exports.recordPaidOrder = recordPaidOrder;
exports.getTrackingConfig = getTrackingConfig;
exports.setTrackingConfig = setTrackingConfig;
exports.getBrandingConfig = getBrandingConfig;
exports.setBrandingConfig = setBrandingConfig;
exports.getRegionConfig = getRegionConfig;
exports.setRegionConfig = setRegionConfig;
exports.addEmailJob = addEmailJob;
exports.updateEmailJob = updateEmailJob;
exports.getEmailJob = getEmailJob;
exports.listEmailJobs = listEmailJobs;
exports.listFailedEmailJobs = listFailedEmailJobs;
exports.getTopSeries = getTopSeries;
const crypto_1 = require("crypto");
const persist_1 = require("./persist");
exports.seriesCatalog = [
    {
        id: "c1",
        title: "Midnight Contract",
        type: "comic",
        adult: false,
        coverTone: "warm",
        badge: "Hot",
        latest: "Ep 38",
        genres: ["Romance", "Drama"],
        status: "Ongoing",
        rating: 4.8,
        description: "A contract binds two rivals under the midnight moon.",
        pricing: { currency: "POINTS", episodePrice: 5, discount: 0.0 },
        ttf: { enabled: true, intervalHours: 24 },
        hasFreeEpisodes: true,
        freeEpisodeCount: 28,
        bannerUrl: "https://img2.baidu.com/it/u=2690835672,2180416117&fm=253&fmt=auto&app=138&f=JPEG?w=889&h=500",
    },
    {
        id: "a1",
        title: "After Dark Contract",
        type: "comic",
        adult: true,
        coverTone: "noir",
        badge: "18+",
        latest: "Ep 12",
        genres: ["Thriller", "Drama"],
        status: "Ongoing",
        rating: 4.6,
        description: "Adult-only midnight thriller.",
        pricing: { currency: "POINTS", episodePrice: 6, discount: 0.0 },
        ttf: { enabled: true, intervalHours: 24 },
        hasFreeEpisodes: true,
        freeEpisodeCount: 9,
    },
];
const wallets = new Map();
const entitlements = new Map();
const orders = new Map();
const paymentIntents = new Map();
const sessions = new Map();
const usersByEmail = new Map();
const usersById = new Map();
const progress = new Map();
const comments = new Map();
const ratings = new Map();
const notifications = new Map();
const follows = new Map();
const coupons = new Map();
const promotionsById = new Map();
const rewards = new Map();
const missions = new Map();
const idempotencyByUser = new Map();
const rateLimitByUser = new Map();
const subscriptionUsageByUser = new Map();
const subscriptionVoucherByUser = new Map();
const bookmarksByUser = new Map();
const historyByUser = new Map();
const searchLogByDay = new Map();
const viewStatsByDate = new Map();
const registrationStatsByDate = new Map();
const dauStatsByDate = new Map();
const paidOrdersByDate = new Map();
const seriesViewByDate = new Map();
let trackingConfig = {
    values: {},
    updatedAt: null,
};
let brandingConfig = {
    siteLogoUrl: "",
    faviconUrl: "",
    homeBannerUrl: "https://img2.baidu.com/it/u=2690835672,2180416117&fm=253&fmt=auto&app=138&f=JPEG?w=889&h=500",
    updatedAt: null,
};
let regionConfig = {
    countryCodes: [
        { code: "+1", label: "US" },
        { code: "+82", label: "KR" },
        { code: "+86", label: "CN" },
        { code: "+81", label: "JP" },
        { code: "+65", label: "SG" },
    ],
    lengthRules: {
        "+1": [10],
        "+82": [9, 10, 11],
        "+86": [11],
        "+81": [9, 10, 11],
        "+65": [8],
    },
    updatedAt: null,
};
const emailJobs = new Map();
const seriesById = new Map();
const episodesBySeriesId = new Map();
const persisted = (0, persist_1.readPersistedStore)();
function hydrateMap(map, record) {
    map.clear();
    Object.entries(record || {}).forEach(([key, value]) => {
        map.set(key, value);
    });
}
function hydrateMapOfMap(map, record) {
    map.clear();
    Object.entries(record || {}).forEach(([key, value]) => {
        const inner = new Map();
        Object.entries(value || {}).forEach(([innerKey, innerValue]) => {
            inner.set(innerKey, innerValue);
        });
        map.set(key, inner);
    });
}
function hydrateMapOfSet(map, record) {
    map.clear();
    Object.entries(record || {}).forEach(([key, value]) => {
        map.set(key, new Set(Array.isArray(value) ? value : []));
    });
}
function mapToRecord(map) {
    const result = {};
    map.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}
function mapOfMapToRecord(map) {
    const result = {};
    map.forEach((value, key) => {
        result[key] = mapToRecord(value);
    });
    return result;
}
function mapOfSetToRecord(map) {
    const result = {};
    map.forEach((value, key) => {
        result[key] = Array.from(value);
    });
    return result;
}
function persistStore() {
    (0, persist_1.schedulePersist)({
        usersByEmail: mapToRecord(usersByEmail),
        usersById: mapToRecord(usersById),
        sessions: mapToRecord(sessions),
        wallets: mapToRecord(wallets),
        entitlements: mapOfMapToRecord(entitlements),
        orders: mapToRecord(orders),
        paymentIntents: mapOfMapToRecord(paymentIntents),
        progress: mapToRecord(progress),
        seriesById: mapToRecord(seriesById),
        episodesBySeriesId: mapToRecord(episodesBySeriesId),
        promotionsById: mapToRecord(promotionsById),
        coupons: mapToRecord(coupons),
        rewards: mapToRecord(rewards),
        missions: mapToRecord(missions),
        follows: mapToRecord(follows),
        notifications: mapToRecord(notifications),
        comments: mapToRecord(comments),
        ratings: mapOfMapToRecord(ratings),
        subscriptionUsage: mapToRecord(subscriptionUsageByUser),
        subscriptionVoucher: mapToRecord(subscriptionVoucherByUser),
        bookmarks: mapToRecord(bookmarksByUser),
        history: mapToRecord(historyByUser),
        trackingConfig,
        brandingConfig,
        regionConfig,
        emailJobs: mapToRecord(emailJobs),
        searchLog: mapOfMapToRecord(searchLogByDay),
        viewStatsByDate: mapToRecord(viewStatsByDate),
        registrationStatsByDate: mapToRecord(registrationStatsByDate),
        dauStatsByDate: mapOfSetToRecord(dauStatsByDate),
        paidOrdersByDate: mapToRecord(paidOrdersByDate),
        seriesViewByDate: mapOfMapToRecord(seriesViewByDate),
    });
}
if (persisted && Object.keys(persisted).length > 0) {
    if (persisted.usersByEmail) {
        hydrateMap(usersByEmail, persisted.usersByEmail);
    }
    if (persisted.usersById) {
        hydrateMap(usersById, persisted.usersById);
    }
    if (persisted.sessions) {
        hydrateMap(sessions, persisted.sessions);
    }
    if (persisted.wallets) {
        hydrateMap(wallets, persisted.wallets);
    }
    if (persisted.entitlements) {
        hydrateMapOfMap(entitlements, persisted.entitlements);
    }
    if (persisted.orders) {
        hydrateMap(orders, persisted.orders);
    }
    if (persisted.paymentIntents) {
        hydrateMapOfMap(paymentIntents, persisted.paymentIntents);
    }
    if (persisted.progress) {
        hydrateMap(progress, persisted.progress);
    }
    if (persisted.seriesById && Object.keys(persisted.seriesById).length > 0) {
        hydrateMap(seriesById, persisted.seriesById);
    }
    if (persisted.episodesBySeriesId && Object.keys(persisted.episodesBySeriesId).length > 0) {
        hydrateMap(episodesBySeriesId, persisted.episodesBySeriesId);
    }
    if (persisted.promotionsById) {
        hydrateMap(promotionsById, persisted.promotionsById);
    }
    if (persisted.coupons) {
        hydrateMap(coupons, persisted.coupons);
    }
    if (persisted.rewards) {
        hydrateMap(rewards, persisted.rewards);
    }
    if (persisted.missions) {
        hydrateMap(missions, persisted.missions);
    }
    if (persisted.follows) {
        hydrateMap(follows, persisted.follows);
    }
    if (persisted.notifications) {
        hydrateMap(notifications, persisted.notifications);
    }
    if (persisted.comments) {
        hydrateMap(comments, persisted.comments);
    }
    if (persisted.ratings) {
        hydrateMapOfMap(ratings, persisted.ratings);
    }
    if (persisted.subscriptionUsage) {
        hydrateMap(subscriptionUsageByUser, persisted.subscriptionUsage);
    }
    if (persisted.subscriptionVoucher) {
        hydrateMap(subscriptionVoucherByUser, persisted.subscriptionVoucher);
    }
    if (persisted.bookmarks) {
        hydrateMap(bookmarksByUser, persisted.bookmarks);
    }
    if (persisted.history) {
        hydrateMap(historyByUser, persisted.history);
    }
    if (persisted.searchLog) {
        hydrateMapOfMap(searchLogByDay, persisted.searchLog);
    }
    if (persisted.viewStatsByDate) {
        hydrateMap(viewStatsByDate, persisted.viewStatsByDate);
    }
    if (persisted.registrationStatsByDate) {
        hydrateMap(registrationStatsByDate, persisted.registrationStatsByDate);
    }
    if (persisted.dauStatsByDate) {
        hydrateMapOfSet(dauStatsByDate, persisted.dauStatsByDate);
    }
    if (persisted.paidOrdersByDate) {
        hydrateMap(paidOrdersByDate, persisted.paidOrdersByDate);
    }
    if (persisted.seriesViewByDate) {
        hydrateMapOfMap(seriesViewByDate, persisted.seriesViewByDate);
    }
    if (persisted.trackingConfig) {
        trackingConfig = persisted.trackingConfig;
    }
    if (persisted.brandingConfig) {
        brandingConfig = persisted.brandingConfig;
    }
    if (persisted.regionConfig) {
        regionConfig = persisted.regionConfig;
    }
    if (persisted.emailJobs) {
        hydrateMap(emailJobs, persisted.emailJobs);
    }
}
const TOPUP_PACKAGES = {
    starter: { packageId: "starter", paidPts: 50, bonusPts: 5, price: 3.99 },
    medium: { packageId: "medium", paidPts: 100, bonusPts: 15, price: 7.99 },
    value: { packageId: "value", paidPts: 200, bonusPts: 40, price: 14.99 },
    mega: { packageId: "mega", paidPts: 500, bonusPts: 120, price: 29.99 },
    premium: { packageId: "premium", paidPts: 300, bonusPts: 60, price: 19.99 },
};
const PLAN_CATALOG = {
    basic: {
        id: "basic",
        discountPct: 10,
        dailyFreeUnlocks: 1,
        ttfMultiplier: 0.8,
        voucherPts: 5,
    },
    pro: {
        id: "pro",
        discountPct: 20,
        dailyFreeUnlocks: 2,
        ttfMultiplier: 0.6,
        voucherPts: 8,
    },
    vip: {
        id: "vip",
        discountPct: 30,
        dailyFreeUnlocks: 3,
        ttfMultiplier: 0.5,
        voucherPts: 10,
    },
};
const PROMOTION_FALLBACK = {
    ctaType: "STORE",
    ctaTarget: "",
    ctaLabel: "View offer",
};
const DEFAULT_PROMOTIONS = [
    {
        id: "promo_first_purchase",
        title: "First purchase bonus",
        type: "FIRST_PURCHASE",
        active: true,
        bonusMultiplier: 2,
        description: "Double bonus POINTS for your first purchase.",
    },
    {
        id: "promo_holiday",
        title: "Holiday deal",
        type: "HOLIDAY",
        active: true,
        description: "Limited-time discount for your next unlock.",
    },
    {
        id: "promo_returning",
        title: "Welcome back",
        type: "RETURNING",
        active: true,
        description: "Claim your welcome back bonus and keep reading.",
    },
];
const COUPON_CATALOG = {
    HOLIDAY10: {
        id: "HOLIDAY10",
        code: "HOLIDAY10",
        type: "DISCOUNT_PCT",
        value: 10,
        remainingUses: 1,
        label: "Holiday 10% OFF",
    },
    WELCOME5: {
        id: "WELCOME5",
        code: "WELCOME5",
        type: "DISCOUNT_PTS",
        value: 5,
        remainingUses: 1,
        label: "Welcome 5 POINTS",
    },
};
const DEFAULT_WALLET = {
    paidPts: 120,
    bonusPts: 20,
    plan: "free",
    subscription: null,
    subscriptionUsage: null,
    subscriptionVoucher: null,
};
function parseLatestNumber(value) {
    const match = String(value || "").match(/(\d+)/);
    if (!match) {
        return 0;
    }
    return Number.parseInt(match[1], 10) || 0;
}
function buildEpisodes(seriesId, latestNumber, pricePts) {
    const now = Date.now();
    return Array.from({ length: latestNumber }, (_, index) => {
        const number = index + 1;
        const releasedAt = new Date(now - (latestNumber - number) * 7 * 24 * 60 * 60 * 1000).toISOString();
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
function ensureSeriesStore() {
    if (seriesById.size > 0) {
        return;
    }
    exports.seriesCatalog.forEach((entry) => {
        var _a;
        const latestNumber = parseLatestNumber(entry.latest || "");
        const pricePts = Number(((_a = entry.pricing) === null || _a === void 0 ? void 0 : _a.episodePrice) || 0);
        const episodes = buildEpisodes(entry.id, latestNumber, pricePts);
        const latestEpisode = episodes[episodes.length - 1];
        seriesById.set(entry.id, {
            ...entry,
            badges: entry.badge ? [entry.badge] : [],
            ratingCount: 0,
            latestEpisodeId: latestEpisode ? latestEpisode.id : "",
        });
        episodesBySeriesId.set(entry.id, episodes);
    });
}
function normalizeSeries(input) {
    const pricing = input.pricing || {};
    const ttf = input.ttf || {};
    return {
        id: input.id,
        title: input.title || "",
        type: input.type || "comic",
        adult: Boolean(input.adult),
        coverTone: input.coverTone || "",
        coverUrl: input.coverUrl || "",
        badge: input.badge || "",
        badges: Array.isArray(input.badges)
            ? input.badges
            : input.badge
                ? [input.badge]
                : [],
        latest: input.latest || "",
        latestEpisodeId: input.latestEpisodeId || "",
        genres: Array.isArray(input.genres) ? input.genres : [],
        status: input.status || "Ongoing",
        isPublished: input.isPublished !== undefined ? Boolean(input.isPublished) : true,
        isFeatured: Boolean(input.isFeatured),
        rating: Number(input.rating || 0),
        ratingCount: Number(input.ratingCount || 0),
        description: input.description || "",
        pricing: {
            currency: pricing.currency || "POINTS",
            episodePrice: Number(pricing.episodePrice || 0),
            discount: Number(pricing.discount || 0),
        },
        ttf: {
            enabled: Boolean(ttf.enabled),
            intervalHours: Number(ttf.intervalHours || 24),
        },
    };
}
function normalizeEpisode(seriesId, input) {
    return {
        id: input.id || `${seriesId}e${input.number || 1}`,
        seriesId,
        number: Number(input.number || 1),
        title: input.title || `Episode ${input.number || 1}`,
        releasedAt: input.releasedAt || new Date().toISOString(),
        pricePts: Number(input.pricePts || 0),
        ttfEligible: Boolean(input.ttfEligible),
        ttfReadyAt: input.ttfReadyAt || null,
        previewFreePages: Number(input.previewFreePages || 0),
        pages: Array.isArray(input.pages) ? input.pages : undefined,
        paragraphs: Array.isArray(input.paragraphs) ? input.paragraphs : undefined,
        text: input.text || undefined,
    };
}
function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}
function parseDateKey(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
}
function formatDateKey(date) {
    return date.toISOString().slice(0, 10);
}
function buildDateRange(from, to) {
    const toDate = parseDateKey(to) || new Date();
    const fromDate = parseDateKey(from) ||
        new Date(toDate.getTime() - 13 * 24 * 60 * 60 * 1000);
    const start = new Date(Math.min(fromDate.getTime(), toDate.getTime()));
    const end = new Date(Math.max(fromDate.getTime(), toDate.getTime()));
    const result = [];
    const cursor = new Date(start.getTime());
    while (cursor <= end) {
        result.push(formatDateKey(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
}
function createId(prefix) {
    return `${prefix}_${(0, crypto_1.randomUUID)()}`;
}
function createUser(email, password) {
    if (usersByEmail.has(email)) {
        return null;
    }
    const user = { id: createId("u"), email, password, isBlocked: false };
    usersByEmail.set(email, user);
    usersById.set(user.id, user);
    persistStore();
    return user;
}
function getAllUserIds() {
    return Array.from(usersById.keys());
}
function getAllUsers() {
    return Array.from(usersById.values());
}
function validateUser(email, password) {
    const user = usersByEmail.get(email);
    if (!user || user.password !== password) {
        return null;
    }
    return user;
}
function getUserById(userId) {
    return usersById.get(userId) || null;
}
function setUserBlocked(userId, blocked) {
    const user = usersById.get(userId);
    if (!user) {
        return null;
    }
    user.isBlocked = blocked;
    usersById.set(userId, user);
    persistStore();
    return user;
}
function createSession(userId) {
    const token = createId("sess");
    sessions.set(token, userId);
    persistStore();
    return token;
}
function deleteSession(token) {
    sessions.delete(token);
    persistStore();
}
function getSessionUserId(sessionToken) {
    if (!sessionToken) {
        return null;
    }
    return sessions.get(sessionToken) || null;
}
function getSeriesList() {
    ensureSeriesStore();
    return Array.from(seriesById.values());
}
function getSeriesById(seriesId) {
    ensureSeriesStore();
    return seriesById.get(seriesId) || null;
}
function getSeriesEpisodes(seriesId) {
    ensureSeriesStore();
    return episodesBySeriesId.get(seriesId) || [];
}
function applyTtfAccelerationToEpisode(episode, series, subscription) {
    var _a, _b;
    if (!episode.ttfEligible || !episode.ttfReadyAt) {
        return episode;
    }
    const multiplier = (_a = subscription === null || subscription === void 0 ? void 0 : subscription.perks) === null || _a === void 0 ? void 0 : _a.ttfMultiplier;
    if (!multiplier || multiplier >= 1) {
        return episode;
    }
    const releasedAtMs = Date.parse(episode.releasedAt);
    if (Number.isNaN(releasedAtMs)) {
        return episode;
    }
    const intervalHours = ((_b = series === null || series === void 0 ? void 0 : series.ttf) === null || _b === void 0 ? void 0 : _b.intervalHours) || 24;
    const baseReadyAtMs = releasedAtMs + intervalHours * 60 * 60 * 1000;
    const acceleratedReadyAtMs = releasedAtMs + intervalHours * multiplier * 60 * 60 * 1000;
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
function getSeriesEpisodesForUser(seriesId, subscription) {
    const episodes = getSeriesEpisodes(seriesId);
    if (!(subscription === null || subscription === void 0 ? void 0 : subscription.active)) {
        return episodes;
    }
    const series = getSeriesById(seriesId);
    return episodes.map((episode) => applyTtfAccelerationToEpisode(episode, series, subscription));
}
function setSeries(seriesId, input) {
    ensureSeriesStore();
    const series = normalizeSeries({ ...input, id: seriesId });
    const existingEpisodes = episodesBySeriesId.get(seriesId) || [];
    if (existingEpisodes.length > 0) {
        const latestEpisode = existingEpisodes[existingEpisodes.length - 1];
        series.latestEpisodeId = (latestEpisode === null || latestEpisode === void 0 ? void 0 : latestEpisode.id) || series.latestEpisodeId;
    }
    seriesById.set(seriesId, series);
    if (!episodesBySeriesId.has(seriesId)) {
        episodesBySeriesId.set(seriesId, []);
    }
    persistStore();
    return series;
}
function deleteSeries(seriesId) {
    ensureSeriesStore();
    seriesById.delete(seriesId);
    episodesBySeriesId.delete(seriesId);
    persistStore();
}
function setSeriesEpisodes(seriesId, episodes) {
    ensureSeriesStore();
    const normalized = (episodes || []).map((episode) => normalizeEpisode(seriesId, episode));
    normalized.sort((a, b) => a.number - b.number);
    episodesBySeriesId.set(seriesId, normalized);
    const series = seriesById.get(seriesId);
    if (series) {
        const latestEpisode = normalized[normalized.length - 1];
        series.latestEpisodeId = latestEpisode ? latestEpisode.id : "";
    }
    persistStore();
    return normalized;
}
function upsertEpisode(seriesId, input) {
    ensureSeriesStore();
    const list = episodesBySeriesId.get(seriesId) || [];
    const normalized = normalizeEpisode(seriesId, input);
    const index = list.findIndex((episode) => episode.id === normalized.id);
    if (index >= 0) {
        list[index] = { ...list[index], ...normalized };
    }
    else {
        list.push(normalized);
    }
    list.sort((a, b) => a.number - b.number);
    episodesBySeriesId.set(seriesId, list);
    const series = seriesById.get(seriesId);
    if (series) {
        const latestEpisode = list[list.length - 1];
        series.latestEpisodeId = latestEpisode ? latestEpisode.id : "";
    }
    persistStore();
    return normalized;
}
function deleteEpisode(seriesId, episodeId) {
    ensureSeriesStore();
    const list = episodesBySeriesId.get(seriesId) || [];
    const next = list.filter((episode) => episode.id !== episodeId);
    episodesBySeriesId.set(seriesId, next);
    const series = seriesById.get(seriesId);
    if (series) {
        const latestEpisode = next[next.length - 1];
        series.latestEpisodeId = latestEpisode ? latestEpisode.id : "";
    }
    persistStore();
    return next;
}
function bulkGenerateEpisodes(seriesId, count, baseProps = {}) {
    var _a;
    ensureSeriesStore();
    const series = seriesById.get(seriesId);
    const pricePts = Number(baseProps.pricePts || ((_a = series === null || series === void 0 ? void 0 : series.pricing) === null || _a === void 0 ? void 0 : _a.episodePrice) || 0);
    const latestNumber = Number(count || 0);
    const episodes = buildEpisodes(seriesId, latestNumber, pricePts).map((episode) => ({
        ...episode,
        ttfEligible: baseProps.ttfEligible === undefined ? episode.ttfEligible : baseProps.ttfEligible,
        previewFreePages: baseProps.previewFreePages === undefined
            ? episode.previewFreePages
            : baseProps.previewFreePages,
    }));
    const result = setSeriesEpisodes(seriesId, episodes);
    persistStore();
    return result;
}
function getEpisodeById(seriesId, episodeId) {
    return getSeriesEpisodes(seriesId).find((ep) => ep.id === episodeId) || null;
}
function getWallet(userId) {
    if (!wallets.has(userId)) {
        wallets.set(userId, { ...DEFAULT_WALLET });
    }
    return wallets.get(userId);
}
function setWallet(userId, wallet) {
    wallets.set(userId, wallet);
    persistStore();
    return wallet;
}
function chargeWallet(wallet, pricePts) {
    const total = (wallet.paidPts || 0) + (wallet.bonusPts || 0);
    const shortfall = pricePts - total;
    if (shortfall > 0) {
        return { ok: false, shortfallPts: shortfall };
    }
    let paidPts = wallet.paidPts || 0;
    let bonusPts = wallet.bonusPts || 0;
    let remaining = pricePts;
    const useBonus = Math.min(bonusPts, remaining);
    bonusPts -= useBonus;
    remaining -= useBonus;
    const usePaid = Math.min(paidPts, remaining);
    paidPts -= usePaid;
    remaining -= usePaid;
    return { ok: true, wallet: { ...wallet, paidPts, bonusPts } };
}
function getEntitlement(userId, seriesId) {
    if (!entitlements.has(userId)) {
        entitlements.set(userId, new Map());
    }
    const map = entitlements.get(userId);
    if (!map.has(seriesId)) {
        map.set(seriesId, { seriesId, unlockedEpisodeIds: [] });
    }
    return map.get(seriesId);
}
function setEntitlement(userId, seriesId, entitlement) {
    if (!entitlements.has(userId)) {
        entitlements.set(userId, new Map());
    }
    entitlements.get(userId).set(seriesId, entitlement);
    persistStore();
    return entitlement;
}
function applyUnlock(entitlement, episodeId) {
    const unlocked = Array.isArray(entitlement.unlockedEpisodeIds)
        ? [...entitlement.unlockedEpisodeIds]
        : [];
    if (!unlocked.includes(episodeId)) {
        unlocked.push(episodeId);
    }
    return { ...entitlement, unlockedEpisodeIds: unlocked };
}
function addOrder(userId, order) {
    if (!orders.has(userId)) {
        orders.set(userId, []);
    }
    const list = orders.get(userId);
    list.unshift(order);
    persistStore();
    return order;
}
function getOrders(userId) {
    if (!orders.has(userId)) {
        orders.set(userId, []);
    }
    return orders.get(userId);
}
function getAllOrders() {
    const list = [];
    orders.forEach((items, userId) => {
        items.forEach((order) => {
            list.push({ ...order, userId });
        });
    });
    return list;
}
function adjustWallet(userId, payload) {
    const wallet = getWallet(userId);
    const paidPts = (wallet.paidPts || 0) + Number(payload.paidDelta || 0);
    const bonusPts = (wallet.bonusPts || 0) + Number(payload.bonusDelta || 0);
    const next = { ...wallet, paidPts: Math.max(0, paidPts), bonusPts: Math.max(0, bonusPts) };
    setWallet(userId, next);
    persistStore();
    return next;
}
function getTopupPackage(packageId) {
    if (!packageId) {
        return null;
    }
    const key = packageId.toLowerCase();
    return TOPUP_PACKAGES[key] || null;
}
function getPaymentMap(userId) {
    if (!paymentIntents.has(userId)) {
        paymentIntents.set(userId, new Map());
    }
    return paymentIntents.get(userId);
}
function createPaymentIntent(userId, packageId, provider = "stripe") {
    const pkg = getTopupPackage(packageId);
    if (!pkg) {
        return null;
    }
    const orderId = createId("ord");
    const order = {
        orderId,
        packageId: pkg.packageId,
        amount: pkg.price,
        currency: "USD",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        provider,
        paidPts: pkg.paidPts,
        bonusPts: pkg.bonusPts,
    };
    addOrder(userId, order);
    const payment = {
        paymentId: createId("pay"),
        orderId,
        provider,
        status: "AUTHORIZED",
        createdAt: new Date().toISOString(),
    };
    getPaymentMap(userId).set(payment.paymentId, payment);
    persistStore();
    return { order, payment };
}
function confirmPaymentIntent(userId, paymentId) {
    const payment = getPaymentMap(userId).get(paymentId);
    if (!payment) {
        return { ok: false, error: "PAYMENT_NOT_FOUND" };
    }
    const order = getOrders(userId).find((item) => item.orderId === payment.orderId);
    if (!order) {
        return { ok: false, error: "ORDER_NOT_FOUND" };
    }
    if (order.status === "PAID") {
        return { ok: true, order, wallet: getWallet(userId) };
    }
    const wallet = getWallet(userId);
    const nextWallet = {
        ...wallet,
        paidPts: (wallet.paidPts || 0) + (order.paidPts || 0),
        bonusPts: (wallet.bonusPts || 0) + (order.bonusPts || 0),
    };
    order.status = "PAID";
    order.paidAt = new Date().toISOString();
    payment.status = "CAPTURED";
    setWallet(userId, nextWallet);
    recordPaidOrder();
    persistStore();
    return { ok: true, order, wallet: nextWallet };
}
function refundOrder(userId, orderId) {
    const order = getOrders(userId).find((item) => item.orderId === orderId);
    if (!order) {
        return { ok: false, error: "ORDER_NOT_FOUND" };
    }
    if (order.status !== "PAID") {
        return { ok: false, error: "ORDER_NOT_PAID" };
    }
    const wallet = getWallet(userId);
    const refundPts = (order.paidPts || 0) + (order.bonusPts || 0);
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
    persistStore();
    return { ok: true, order, wallet: nextWallet, refundShortfall: remaining };
}
function updateOrderStatus(userId, orderId, status, payload = {}) {
    const order = getOrders(userId).find((item) => item.orderId === orderId);
    if (!order) {
        return { ok: false, error: "ORDER_NOT_FOUND" };
    }
    order.status = status;
    if (payload === null || payload === void 0 ? void 0 : payload.reason) {
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
    persistStore();
    return { ok: true, order };
}
function applyChargeback(userId, orderId, reason = "chargeback") {
    const order = getOrders(userId).find((item) => item.orderId === orderId);
    if (!order) {
        return { ok: false, error: "ORDER_NOT_FOUND" };
    }
    if (order.status === "CHARGEBACK") {
        return { ok: true, order, wallet: getWallet(userId) };
    }
    const wallet = getWallet(userId);
    const refundPts = (order.paidPts || 0) + (order.bonusPts || 0);
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
    order.status = "CHARGEBACK";
    order.reason = reason;
    order.chargebackAt = new Date().toISOString();
    setWallet(userId, nextWallet);
    persistStore();
    return { ok: true, order, wallet: nextWallet, refundShortfall: remaining };
}
function reconcileOrders(userId) {
    const list = getOrders(userId);
    const now = Date.now();
    let updated = 0;
    list.forEach((order) => {
        if (order.status === "PENDING") {
            const created = Date.parse(order.createdAt);
            if (!Number.isNaN(created) && now - created > 15 * 60 * 1000) {
                order.status = "FAILED";
                order.failedAt = new Date().toISOString();
                updated += 1;
            }
        }
    });
    if (updated > 0) {
        persistStore();
    }
    return { updated, orders: list };
}
function getFollowedSeriesIds(userId) {
    if (!follows.has(userId)) {
        follows.set(userId, []);
    }
    return follows.get(userId);
}
function setFollowedSeriesIds(userId, ids) {
    const unique = Array.from(new Set(ids));
    follows.set(userId, unique);
    persistStore();
    return unique;
}
function getNotifications(userId, followedSeriesIds) {
    const list = notifications.get(userId) || [];
    const seriesList = followedSeriesIds
        .map((seriesId) => getSeriesById(seriesId))
        .filter(Boolean);
    const next = [...list];
    seriesList.forEach((series) => {
        const episodes = getSeriesEpisodes(series.id);
        const latestEpisode = episodes[episodes.length - 1];
        if (!latestEpisode) {
            return;
        }
        const id = `NEW_EPISODE_${series.id}_${latestEpisode.id}`;
        if (!next.some((item) => item.id === id)) {
            next.unshift({
                id,
                type: "NEW_EPISODE",
                title: `${series.title} updated`,
                message: `${latestEpisode.title} is now available.`,
                seriesId: series.id,
                episodeId: latestEpisode.id,
                createdAt: latestEpisode.releasedAt,
                read: false,
            });
        }
        if (latestEpisode.ttfEligible && latestEpisode.ttfReadyAt) {
            const readyAt = Date.parse(latestEpisode.ttfReadyAt);
            if (!Number.isNaN(readyAt) && readyAt <= Date.now()) {
                const ttfId = `TTF_READY_${series.id}_${latestEpisode.id}`;
                if (!next.some((item) => item.id === ttfId)) {
                    next.unshift({
                        id: ttfId,
                        type: "TTF_READY",
                        title: `${series.title} free claim`,
                        message: `${latestEpisode.title} is ready to claim.`,
                        seriesId: series.id,
                        episodeId: latestEpisode.id,
                        createdAt: latestEpisode.ttfReadyAt,
                        read: false,
                    });
                }
            }
        }
    });
    getPromotions().filter((promo) => promo.active).forEach((promo) => {
        const id = `PROMO_${promo.id}`;
        if (!next.some((item) => item.id === id)) {
            next.unshift({
                id,
                type: "PROMO",
                title: promo.title,
                message: promo.description,
                createdAt: new Date().toISOString(),
                read: false,
                ctaType: "STORE",
                ctaLabel: "View offer",
            });
        }
    });
    notifications.set(userId, next);
    return next;
}
function addNotification(userId, payload) {
    const list = notifications.get(userId) || [];
    const entry = {
        id: createId("n"),
        type: payload.type || "PROMO",
        title: payload.title || "Notification",
        message: payload.message || "",
        seriesId: payload.seriesId || null,
        episodeId: payload.episodeId || null,
        createdAt: new Date().toISOString(),
        read: false,
        ctaType: payload.ctaType || "",
        ctaLabel: payload.ctaLabel || "",
        ctaTarget: payload.ctaTarget || "",
    };
    list.unshift(entry);
    notifications.set(userId, list);
    persistStore();
    return entry;
}
function getAllNotifications() {
    const list = [];
    notifications.forEach((items, userId) => {
        items.forEach((item) => list.push({ ...item, userId }));
    });
    return list;
}
function markNotificationsRead(userId, notificationIds) {
    const list = notifications.get(userId) || [];
    const ids = new Set(notificationIds || []);
    const next = list.map((item) => (ids.has(item.id) ? { ...item, read: true } : item));
    notifications.set(userId, next);
    persistStore();
    return next;
}
function getComments(seriesId) {
    if (!comments.has(seriesId)) {
        comments.set(seriesId, []);
    }
    return comments.get(seriesId);
}
function addComment(seriesId, userId, text) {
    const list = getComments(seriesId);
    const user = getUserById(userId);
    const entry = {
        id: createId("c"),
        seriesId,
        userId,
        author: (user === null || user === void 0 ? void 0 : user.email) || "Guest",
        text,
        createdAt: new Date().toISOString(),
        likes: [],
        hidden: false,
        replies: [],
    };
    list.unshift(entry);
    persistStore();
    return entry;
}
function getAllComments() {
    const list = [];
    comments.forEach((items) => {
        items.forEach((item) => list.push(item));
    });
    return list;
}
function setCommentHidden(seriesId, commentId, hidden) {
    const list = getComments(seriesId);
    const target = list.find((item) => item.id === commentId);
    if (!target) {
        return null;
    }
    target.hidden = hidden;
    persistStore();
    return target;
}
function recalcSeriesRating(seriesId) {
    const stats = getRatingStats(seriesId);
    const series = getSeriesById(seriesId);
    if (series) {
        series.rating = stats.rating;
        series.ratingCount = stats.count;
    }
    return stats;
}
function addCommentReply(seriesId, commentId, userId, text) {
    const list = getComments(seriesId);
    const target = list.find((item) => item.id === commentId);
    if (!target) {
        return null;
    }
    const user = getUserById(userId);
    const reply = {
        id: createId("r"),
        userId,
        author: (user === null || user === void 0 ? void 0 : user.email) || "Guest",
        text,
        createdAt: new Date().toISOString(),
    };
    target.replies = Array.isArray(target.replies) ? target.replies : [];
    target.replies.push(reply);
    persistStore();
    return target;
}
function toggleCommentLike(seriesId, commentId, userId) {
    const list = getComments(seriesId);
    const target = list.find((item) => item.id === commentId);
    if (!target) {
        return null;
    }
    target.likes = Array.isArray(target.likes) ? target.likes : [];
    if (target.likes.includes(userId)) {
        target.likes = target.likes.filter((id) => id !== userId);
    }
    else {
        target.likes.push(userId);
    }
    persistStore();
    return target;
}
function getRatingStats(seriesId) {
    if (!ratings.has(seriesId)) {
        ratings.set(seriesId, new Map());
    }
    const map = ratings.get(seriesId);
    const values = Array.from(map.values());
    const count = values.length;
    const avg = count === 0 ? 0 : values.reduce((sum, val) => sum + val, 0) / count;
    return { rating: Number(avg.toFixed(2)), count };
}
function setRating(seriesId, userId, value) {
    if (!ratings.has(seriesId)) {
        ratings.set(seriesId, new Map());
    }
    const ratingValue = Math.min(5, Math.max(1, Number(value || 0)));
    ratings.get(seriesId).set(userId, ratingValue);
    const stats = getRatingStats(seriesId);
    const series = getSeriesById(seriesId);
    if (series) {
        series.rating = stats.rating;
    }
    persistStore();
    return stats;
}
function getProgress(userId) {
    if (!progress.has(userId)) {
        progress.set(userId, {});
    }
    return progress.get(userId);
}
function updateProgress(userId, seriesId, payload) {
    const store = getProgress(userId);
    store[seriesId] = {
        lastEpisodeId: payload.lastEpisodeId,
        percent: payload.percent,
        updatedAt: payload.updatedAt || Date.now(),
    };
    persistStore();
    return store;
}
function getBookmarks(userId) {
    if (!bookmarksByUser.has(userId)) {
        bookmarksByUser.set(userId, {});
    }
    return bookmarksByUser.get(userId);
}
function addBookmark(userId, seriesId, entry) {
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
    store[seriesId] = nextList;
    bookmarksByUser.set(userId, store);
    persistStore();
    return store;
}
function removeBookmark(userId, seriesId, bookmarkId) {
    const store = getBookmarks(userId);
    const list = Array.isArray(store[seriesId]) ? store[seriesId] : [];
    store[seriesId] = list.filter((item) => item.id !== bookmarkId);
    bookmarksByUser.set(userId, store);
    persistStore();
    return store;
}
function getReadingHistory(userId) {
    if (!historyByUser.has(userId)) {
        historyByUser.set(userId, []);
    }
    return historyByUser.get(userId);
}
function addReadingHistory(userId, entry) {
    const list = getReadingHistory(userId);
    const nextEntry = {
        id: entry.id || `rh_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        seriesId: entry.seriesId,
        episodeId: entry.episodeId,
        title: entry.title || "",
        percent: entry.percent || 0,
        createdAt: entry.createdAt || new Date().toISOString(),
    };
    const filtered = list.filter((item) => !(item.seriesId === nextEntry.seriesId && item.episodeId === nextEntry.episodeId));
    const next = [nextEntry, ...filtered].slice(0, 100);
    historyByUser.set(userId, next);
    persistStore();
    return next;
}
function recordSearchQuery(_userId, query) {
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
    persistStore();
}
function getHotSearchKeywords(limit = 8) {
    const day = getTodayKey();
    const map = searchLogByDay.get(day) || new Map();
    return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([keyword]) => keyword);
}
function getSearchSuggestions(query, seriesList, limit = 8) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) {
        return [];
    }
    const hits = [];
    (seriesList || []).forEach((series) => {
        if (series.title && String(series.title).toLowerCase().includes(q)) {
            hits.push(series.title);
        }
        (series.genres || []).forEach((genre) => {
            if (String(genre).toLowerCase().includes(q)) {
                hits.push(genre);
            }
        });
    });
    const hot = getHotSearchKeywords(limit * 2).filter((item) => String(item).toLowerCase().includes(q));
    return Array.from(new Set([...hits, ...hot])).slice(0, limit);
}
function getCoupons(userId) {
    if (!coupons.has(userId)) {
        coupons.set(userId, []);
    }
    return coupons.get(userId);
}
function claimCoupon(userId, code) {
    const key = String(code || "").trim().toUpperCase();
    const definition = COUPON_CATALOG[key];
    if (!definition) {
        return { ok: false, message: "Invalid coupon." };
    }
    const list = getCoupons(userId);
    if (list.some((item) => item.code === key)) {
        return { ok: true, coupons: list };
    }
    list.push({ ...definition, claimedAt: new Date().toISOString() });
    persistStore();
    return { ok: true, coupons: list };
}
function ensurePromotions() {
    if (promotionsById.size > 0) {
        return;
    }
    DEFAULT_PROMOTIONS.forEach((promo) => {
        promotionsById.set(promo.id, { ...promo });
    });
}
function getPromotions() {
    ensurePromotions();
    return Array.from(promotionsById.values());
}
function getPromotionFallback() {
    return { ...PROMOTION_FALLBACK };
}
function setPromotionFallback(next) {
    if (!next) {
        return getPromotionFallback();
    }
    PROMOTION_FALLBACK.ctaType = next.ctaType || PROMOTION_FALLBACK.ctaType;
    PROMOTION_FALLBACK.ctaTarget = next.ctaTarget || "";
    PROMOTION_FALLBACK.ctaLabel = next.ctaLabel || PROMOTION_FALLBACK.ctaLabel;
    persistStore();
    return getPromotionFallback();
}
function getPromotionById(promoId) {
    ensurePromotions();
    return promotionsById.get(promoId) || null;
}
function setPromotion(promoId, input) {
    ensurePromotions();
    const normalized = { ...input, id: promoId };
    promotionsById.set(promoId, normalized);
    persistStore();
    return normalized;
}
function deletePromotion(promoId) {
    ensurePromotions();
    promotionsById.delete(promoId);
    persistStore();
}
function getSubscription(userId) {
    var _a;
    return ((_a = wallets.get(userId)) === null || _a === void 0 ? void 0 : _a.subscription) || null;
}
function setSubscription(userId, planId) {
    const wallet = getWallet(userId);
    if (!planId) {
        const next = { ...wallet, plan: "free", subscription: null };
        setWallet(userId, next);
        persistStore();
        return null;
    }
    const plan = PLAN_CATALOG[planId];
    if (!plan) {
        return null;
    }
    const subscription = {
        active: true,
        planId: plan.id,
        startedAt: new Date().toISOString(),
        renewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        perks: {
            discountPct: plan.discountPct,
            dailyFreeUnlocks: plan.dailyFreeUnlocks,
            ttfMultiplier: plan.ttfMultiplier,
            voucherPts: plan.voucherPts,
        },
    };
    const next = { ...wallet, plan: plan.id, subscription };
    setWallet(userId, next);
    persistStore();
    return subscription;
}
function getSubscriptionUsage(userId) {
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
function markDailyUnlockUsed(userId) {
    const usage = getSubscriptionUsage(userId);
    usage.used += 1;
    persistStore();
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
function markSubscriptionVoucherUsed(userId) {
    const usage = getSubscriptionVoucherUsage(userId);
    usage.used = true;
    persistStore();
    return usage;
}
function getSubscriptionVoucher(userId, subscription) {
    var _a;
    if (!(subscription === null || subscription === void 0 ? void 0 : subscription.active) || !((_a = subscription === null || subscription === void 0 ? void 0 : subscription.perks) === null || _a === void 0 ? void 0 : _a.voucherPts)) {
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
function buildWalletSnapshot(userId, wallet, subscription) {
    var _a;
    const activeSub = (subscription === null || subscription === void 0 ? void 0 : subscription.active) ? subscription : (wallet === null || wallet === void 0 ? void 0 : wallet.subscription) || null;
    const usage = (activeSub === null || activeSub === void 0 ? void 0 : activeSub.active) ? getSubscriptionUsage(userId) : null;
    const dailyLimit = ((_a = activeSub === null || activeSub === void 0 ? void 0 : activeSub.perks) === null || _a === void 0 ? void 0 : _a.dailyFreeUnlocks) || 0;
    const remaining = usage ? Math.max(0, dailyLimit - usage.used) : 0;
    const voucher = getSubscriptionVoucher(userId, activeSub);
    return {
        ...wallet,
        plan: (activeSub === null || activeSub === void 0 ? void 0 : activeSub.planId) || (wallet === null || wallet === void 0 ? void 0 : wallet.plan) || "free",
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
function getRewardsState(userId) {
    if (!rewards.has(userId)) {
        rewards.set(userId, {
            lastCheckInDate: "",
            streakCount: 0,
            makeUpUsedToday: false,
        });
    }
    return rewards.get(userId);
}
function checkIn(userId) {
    const state = getRewardsState(userId);
    const today = getTodayKey();
    if (state.lastCheckInDate === today) {
        return { ok: false, error: "ALREADY_CHECKED_IN", state };
    }
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
    const nextStreak = state.lastCheckInDate === yesterday ? state.streakCount + 1 : 1;
    state.lastCheckInDate = today;
    state.streakCount = Math.min(nextStreak, 7);
    state.makeUpUsedToday = false;
    persistStore();
    return { ok: true, state };
}
function makeUpCheckIn(userId) {
    const state = getRewardsState(userId);
    const today = getTodayKey();
    if (state.makeUpUsedToday) {
        return { ok: false, error: "MAKEUP_USED" };
    }
    state.makeUpUsedToday = true;
    state.lastCheckInDate = today;
    state.streakCount = Math.min(Math.max(state.streakCount, 1) + 1, 7);
    persistStore();
    return { ok: true, state };
}
function getMissionState(userId) {
    if (!missions.has(userId)) {
        missions.set(userId, {
            daily: [
                {
                    id: "daily_read",
                    title: "Read 1 episode",
                    desc: "Read any episode",
                    progress: 0,
                    target: 1,
                    reward: 5,
                    claimed: false,
                },
                {
                    id: "daily_follow",
                    title: "Follow 1 series",
                    desc: "Follow any series",
                    progress: 0,
                    target: 1,
                    reward: 5,
                    claimed: false,
                },
                {
                    id: "daily_share",
                    title: "Share 1 series",
                    desc: "Share any series",
                    progress: 0,
                    target: 1,
                    reward: 5,
                    claimed: false,
                },
            ],
            weekly: [
                {
                    id: "weekly_read",
                    title: "Read 10 episodes",
                    desc: "Read 10 episodes",
                    progress: 0,
                    target: 10,
                    reward: 30,
                    claimed: false,
                },
                {
                    id: "weekly_unlock",
                    title: "Unlock 3 episodes",
                    desc: "Unlock 3 episodes",
                    progress: 0,
                    target: 3,
                    reward: 20,
                    claimed: false,
                },
            ],
        });
    }
    return missions.get(userId);
}
function reportMissionEvent(userId, eventType) {
    const state = getMissionState(userId);
    if (eventType === "READ_EPISODE") {
        state.daily[0].progress = Math.min(state.daily[0].target, state.daily[0].progress + 1);
        state.weekly[0].progress = Math.min(state.weekly[0].target, state.weekly[0].progress + 1);
    }
    if (eventType === "FOLLOW_SERIES") {
        state.daily[1].progress = Math.min(state.daily[1].target, state.daily[1].progress + 1);
    }
    if (eventType === "SHARE_SERIES") {
        state.daily[2].progress = Math.min(state.daily[2].target, state.daily[2].progress + 1);
    }
    if (eventType === "UNLOCK_EPISODE") {
        state.weekly[1].progress = Math.min(state.weekly[1].target, state.weekly[1].progress + 1);
    }
    persistStore();
    return state;
}
function claimMission(userId, missionId) {
    const state = getMissionState(userId);
    const all = [...state.daily, ...state.weekly];
    const target = all.find((item) => item.id === missionId);
    if (!target) {
        return { ok: false, error: "MISSION_NOT_FOUND" };
    }
    if (target.claimed || target.progress < target.target) {
        return { ok: false, error: "MISSION_NOT_READY" };
    }
    target.claimed = true;
    persistStore();
    return { ok: true, reward: target.reward, state };
}
function getCouponCatalog() {
    return COUPON_CATALOG;
}
function getPlanCatalog() {
    return PLAN_CATALOG;
}
function getIdempotencyRecord(userId, key) {
    if (!idempotencyByUser.has(userId)) {
        idempotencyByUser.set(userId, new Map());
    }
    return idempotencyByUser.get(userId).get(key);
}
function setIdempotencyRecord(userId, key, value) {
    if (!idempotencyByUser.has(userId)) {
        idempotencyByUser.set(userId, new Map());
    }
    idempotencyByUser.get(userId).set(key, value);
}
function checkRateLimit(userId, action, limit, windowSec) {
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
function recordRegistration(userId) {
    const today = getTodayKey();
    registrationStatsByDate.set(today, (registrationStatsByDate.get(today) || 0) + 1);
    recordDailyActive(userId);
    persistStore();
}
function recordComicView(userId) {
    const today = getTodayKey();
    viewStatsByDate.set(today, (viewStatsByDate.get(today) || 0) + 1);
    if (userId) {
        recordDailyActive(userId);
    }
    persistStore();
}
function recordSeriesView(userId, seriesId) {
    if (!seriesId) {
        return;
    }
    const today = getTodayKey();
    if (!seriesViewByDate.has(today)) {
        seriesViewByDate.set(today, new Map());
    }
    const map = seriesViewByDate.get(today);
    map.set(seriesId, (map.get(seriesId) || 0) + 1);
    if (userId) {
        recordDailyActive(userId);
    }
    persistStore();
}
function recordDailyActive(userId) {
    if (!userId || userId === "guest") {
        return;
    }
    const today = getTodayKey();
    if (!dauStatsByDate.has(today)) {
        dauStatsByDate.set(today, new Set());
    }
    dauStatsByDate.get(today).add(userId);
    persistStore();
}
function getDailyStats(from, to) {
    const keys = buildDateRange(from, to);
    return keys.map((dateKey) => {
        var _a;
        return ({
            date: dateKey,
            views: viewStatsByDate.get(dateKey) || 0,
            registrations: registrationStatsByDate.get(dateKey) || 0,
            dau: ((_a = dauStatsByDate.get(dateKey)) === null || _a === void 0 ? void 0 : _a.size) || 0,
            paidOrders: paidOrdersByDate.get(dateKey) || 0,
        });
    });
}
function recordPaidOrder() {
    const today = getTodayKey();
    paidOrdersByDate.set(today, (paidOrdersByDate.get(today) || 0) + 1);
    persistStore();
}
function getTrackingConfig() {
    return trackingConfig;
}
function setTrackingConfig(values) {
    trackingConfig = {
        values: values || {},
        updatedAt: new Date().toISOString(),
    };
    persistStore();
    return trackingConfig;
}
function getBrandingConfig() {
    return brandingConfig;
}
function setBrandingConfig(values) {
    brandingConfig = {
        ...brandingConfig,
        ...values,
        updatedAt: new Date().toISOString(),
    };
    persistStore();
    return brandingConfig;
}
function getRegionConfig() {
    return regionConfig;
}
function setRegionConfig(values) {
    regionConfig = {
        ...regionConfig,
        ...values,
        updatedAt: new Date().toISOString(),
    };
    persistStore();
    return regionConfig;
}
function addEmailJob(payload) {
    const id = (payload === null || payload === void 0 ? void 0 : payload.id) || createId("email");
    emailJobs.set(id, {
        id,
        status: (payload === null || payload === void 0 ? void 0 : payload.status) || "FAILED",
        provider: (payload === null || payload === void 0 ? void 0 : payload.provider) || "console",
        to: (payload === null || payload === void 0 ? void 0 : payload.to) || "",
        subject: (payload === null || payload === void 0 ? void 0 : payload.subject) || "",
        payload: (payload === null || payload === void 0 ? void 0 : payload.payload) || null,
        priority: (payload === null || payload === void 0 ? void 0 : payload.priority) || "normal",
        error: (payload === null || payload === void 0 ? void 0 : payload.error) || "",
        retries: (payload === null || payload === void 0 ? void 0 : payload.retries) || 0,
        lastAttemptAt: (payload === null || payload === void 0 ? void 0 : payload.lastAttemptAt) || new Date().toISOString(),
    });
    persistStore();
    return emailJobs.get(id);
}
function updateEmailJob(id, patch) {
    const current = emailJobs.get(id);
    if (!current) {
        return null;
    }
    const next = { ...current, ...patch };
    emailJobs.set(id, next);
    persistStore();
    return next;
}
function getEmailJob(id) {
    return emailJobs.get(id) || null;
}
function sanitizeEmailJob(job) {
    return {
        id: job.id,
        status: job.status,
        provider: job.provider,
        to: job.to,
        subject: job.subject,
        priority: job.priority || "normal",
        error: job.error,
        retries: job.retries,
        lastAttemptAt: job.lastAttemptAt,
    };
}
function listEmailJobs(limit = 50) {
    const list = Array.from(emailJobs.values()).map(sanitizeEmailJob);
    list.sort((a, b) => (b.lastAttemptAt || "").localeCompare(a.lastAttemptAt || ""));
    return list.slice(0, limit);
}
function listFailedEmailJobs(limit = 50) {
    const list = Array.from(emailJobs.values())
        .filter((job) => job.status === "FAILED")
        .map(sanitizeEmailJob);
    list.sort((a, b) => {
        if (a.priority !== b.priority) {
            return a.priority === "high" ? -1 : 1;
        }
        return (b.lastAttemptAt || "").localeCompare(a.lastAttemptAt || "");
    });
    return list.slice(0, limit);
}
function getTopSeries(from, to, type, limit = 10) {
    ensureSeriesStore();
    const keys = buildDateRange(from, to);
    const totals = new Map();
    keys.forEach((dateKey) => {
        const map = seriesViewByDate.get(dateKey);
        if (!map) {
            return;
        }
        map.forEach((count, seriesId) => {
            totals.set(seriesId, (totals.get(seriesId) || 0) + count);
        });
    });
    const list = Array.from(totals.entries())
        .map(([seriesId, views]) => {
        const series = getSeriesById(seriesId);
        return {
            seriesId,
            title: (series === null || series === void 0 ? void 0 : series.title) || seriesId,
            type: (series === null || series === void 0 ? void 0 : series.type) || "comic",
            views,
        };
    })
        .filter((item) => (type && type !== "all" ? item.type === type : true))
        .sort((a, b) => b.views - a.views)
        .slice(0, Math.max(1, limit));
    return list;
}
