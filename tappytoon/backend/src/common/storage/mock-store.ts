import { randomUUID } from "crypto";
import { readPersistedStore, schedulePersist } from "./persist";

export type SeriesType = "comic" | "novel";

export const seriesCatalog = [
  {
    id: "c1",
    title: "Midnight Contract",
    type: "comic" as SeriesType,
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
    bannerUrl:
      "https://img2.baidu.com/it/u=2690835672,2180416117&fm=253&fmt=auto&app=138&f=JPEG?w=889&h=500",
  },
  {
    id: "a1",
    title: "After Dark Contract",
    type: "comic" as SeriesType,
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

const wallets = new Map<string, any>();
const entitlements = new Map<string, Map<string, any>>();
const orders = new Map<string, any[]>();
const paymentIntents = new Map<string, Map<string, any>>();
const sessions = new Map<string, string>();
const usersByEmail = new Map<string, any>();
const usersById = new Map<string, any>();
const progress = new Map<string, Record<string, any>>();
const comments = new Map<string, any[]>();
const ratings = new Map<string, Map<string, number>>();
const notifications = new Map<string, any[]>();
const follows = new Map<string, string[]>();
const coupons = new Map<string, any[]>();
const promotionsById = new Map<string, any>();
const rewards = new Map<string, any>();
const missions = new Map<string, any>();
const idempotencyByUser = new Map<string, Map<string, any>>();
const rateLimitByUser = new Map<string, Map<string, any>>();
const subscriptionUsageByUser = new Map<string, any>();
const subscriptionVoucherByUser = new Map<string, any>();
const bookmarksByUser = new Map<string, Record<string, any[]>>();
const historyByUser = new Map<string, any[]>();
const searchLogByDay = new Map<string, Map<string, number>>();
const viewStatsByDate = new Map<string, number>();
const registrationStatsByDate = new Map<string, number>();
const dauStatsByDate = new Map<string, Set<string>>();
const paidOrdersByDate = new Map<string, number>();
const seriesViewByDate = new Map<string, Map<string, number>>();
let trackingConfig: { values: Record<string, any>; updatedAt: string | null } = {
  values: {},
  updatedAt: null,
};
let brandingConfig: {
  siteLogoUrl: string;
  faviconUrl: string;
  homeBannerUrl: string;
  updatedAt: string | null;
} = {
  siteLogoUrl: "",
  faviconUrl: "",
  homeBannerUrl:
    "https://img2.baidu.com/it/u=2690835672,2180416117&fm=253&fmt=auto&app=138&f=JPEG?w=889&h=500",
  updatedAt: null,
};
let regionConfig: {
  countryCodes: { code: string; label: string }[];
  lengthRules: Record<string, number[]>;
  updatedAt: string | null;
} = {
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
const emailJobs = new Map<string, any>();

const seriesById = new Map<string, any>();
const episodesBySeriesId = new Map<string, any[]>();

const persisted = readPersistedStore();

function hydrateMap(map: Map<string, any>, record?: Record<string, any>) {
  map.clear();
  Object.entries(record || {}).forEach(([key, value]) => {
    map.set(key, value);
  });
}

function hydrateMapOfMap(map: Map<string, Map<string, any>>, record?: Record<string, Record<string, any>>) {
  map.clear();
  Object.entries(record || {}).forEach(([key, value]) => {
    const inner = new Map<string, any>();
    Object.entries(value || {}).forEach(([innerKey, innerValue]) => {
      inner.set(innerKey, innerValue);
    });
    map.set(key, inner);
  });
}

function hydrateMapOfSet(map: Map<string, Set<string>>, record?: Record<string, string[]>) {
  map.clear();
  Object.entries(record || {}).forEach(([key, value]) => {
    map.set(key, new Set(Array.isArray(value) ? value : []));
  });
}

function mapToRecord(map: Map<string, any>) {
  const result: Record<string, any> = {};
  map.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function mapOfMapToRecord(map: Map<string, Map<string, any>>) {
  const result: Record<string, Record<string, any>> = {};
  map.forEach((value, key) => {
    result[key] = mapToRecord(value);
  });
  return result;
}

function mapOfSetToRecord(map: Map<string, Set<string>>) {
  const result: Record<string, string[]> = {};
  map.forEach((value, key) => {
    result[key] = Array.from(value);
  });
  return result;
}

function persistStore() {
  schedulePersist({
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

const TOPUP_PACKAGES: Record<string, any> = {
  starter: { packageId: "starter", paidPts: 50, bonusPts: 5, price: 3.99 },
  medium: { packageId: "medium", paidPts: 100, bonusPts: 15, price: 7.99 },
  value: { packageId: "value", paidPts: 200, bonusPts: 40, price: 14.99 },
  mega: { packageId: "mega", paidPts: 500, bonusPts: 120, price: 29.99 },
  premium: { packageId: "premium", paidPts: 300, bonusPts: 60, price: 19.99 },
};

const PLAN_CATALOG: Record<string, any> = {
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

const COUPON_CATALOG: Record<string, any> = {
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

function parseLatestNumber(value: string) {
  const match = String(value || "").match(/(\d+)/);
  if (!match) {
    return 0;
  }
  return Number.parseInt(match[1], 10) || 0;
}

function buildEpisodes(seriesId: string, latestNumber: number, pricePts: number) {
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

function ensureSeriesStore() {
  if (seriesById.size > 0) {
    return;
  }
  seriesCatalog.forEach((entry) => {
    const latestNumber = parseLatestNumber(entry.latest || "");
    const pricePts = Number(entry.pricing?.episodePrice || 0);
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

function normalizeSeries(input: any) {
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

function normalizeEpisode(seriesId: string, input: any) {
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

function parseDateKey(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDateRange(from?: string | null, to?: string | null) {
  const toDate = parseDateKey(to) || new Date();
  const fromDate =
    parseDateKey(from) ||
    new Date(toDate.getTime() - 13 * 24 * 60 * 60 * 1000);
  const start = new Date(
    Math.min(fromDate.getTime(), toDate.getTime())
  );
  const end = new Date(
    Math.max(fromDate.getTime(), toDate.getTime())
  );
  const result: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    result.push(formatDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export function createUser(email: string, password: string) {
  if (usersByEmail.has(email)) {
    return null;
  }
  const user = { id: createId("u"), email, password, isBlocked: false };
  usersByEmail.set(email, user);
  usersById.set(user.id, user);
  persistStore();
  return user;
}

export function getAllUserIds() {
  return Array.from(usersById.keys());
}

export function getAllUsers() {
  return Array.from(usersById.values());
}

export function validateUser(email: string, password: string) {
  const user = usersByEmail.get(email);
  if (!user || user.password !== password) {
    return null;
  }
  return user;
}

export function getUserById(userId: string) {
  return usersById.get(userId) || null;
}

export function setUserBlocked(userId: string, blocked: boolean) {
  const user = usersById.get(userId);
  if (!user) {
    return null;
  }
  user.isBlocked = blocked;
  usersById.set(userId, user);
  persistStore();
  return user;
}

export function createSession(userId: string) {
  const token = createId("sess");
  sessions.set(token, userId);
  persistStore();
  return token;
}

export function deleteSession(token: string) {
  sessions.delete(token);
  persistStore();
}

export function getSessionUserId(sessionToken: string | undefined) {
  if (!sessionToken) {
    return null;
  }
  return sessions.get(sessionToken) || null;
}

export function getSeriesList() {
  ensureSeriesStore();
  return Array.from(seriesById.values());
}

export function getSeriesById(seriesId: string) {
  ensureSeriesStore();
  return seriesById.get(seriesId) || null;
}

export function getSeriesEpisodes(seriesId: string) {
  ensureSeriesStore();
  return episodesBySeriesId.get(seriesId) || [];
}

function applyTtfAccelerationToEpisode(episode: any, series: any, subscription: any) {
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

export function getSeriesEpisodesForUser(seriesId: string, subscription: any) {
  const episodes = getSeriesEpisodes(seriesId);
  if (!subscription?.active) {
    return episodes;
  }
  const series = getSeriesById(seriesId);
  return episodes.map((episode) =>
    applyTtfAccelerationToEpisode(episode, series, subscription)
  );
}

export function setSeries(seriesId: string, input: any) {
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
  persistStore();
  return series;
}

export function deleteSeries(seriesId: string) {
  ensureSeriesStore();
  seriesById.delete(seriesId);
  episodesBySeriesId.delete(seriesId);
  persistStore();
}

export function setSeriesEpisodes(seriesId: string, episodes: any[]) {
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
  persistStore();
  return normalized;
}

export function upsertEpisode(seriesId: string, input: any) {
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
  persistStore();
  return normalized;
}

export function deleteEpisode(seriesId: string, episodeId: string) {
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

export function bulkGenerateEpisodes(seriesId: string, count: number, baseProps: any = {}) {
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
  const result = setSeriesEpisodes(seriesId, episodes);
  persistStore();
  return result;
}

export function getEpisodeById(seriesId: string, episodeId: string) {
  return getSeriesEpisodes(seriesId).find((ep) => ep.id === episodeId) || null;
}

export function getWallet(userId: string) {
  if (!wallets.has(userId)) {
    wallets.set(userId, { ...DEFAULT_WALLET });
  }
  return wallets.get(userId);
}

export function setWallet(userId: string, wallet: any) {
  wallets.set(userId, wallet);
  persistStore();
  return wallet;
}

export function chargeWallet(wallet: any, pricePts: number) {
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

export function getEntitlement(userId: string, seriesId: string) {
  if (!entitlements.has(userId)) {
    entitlements.set(userId, new Map());
  }
  const map = entitlements.get(userId)!;
  if (!map.has(seriesId)) {
    map.set(seriesId, { seriesId, unlockedEpisodeIds: [] });
  }
  return map.get(seriesId);
}

export function setEntitlement(userId: string, seriesId: string, entitlement: any) {
  if (!entitlements.has(userId)) {
    entitlements.set(userId, new Map());
  }
  entitlements.get(userId)!.set(seriesId, entitlement);
  persistStore();
  return entitlement;
}

export function applyUnlock(entitlement: any, episodeId: string) {
  const unlocked = Array.isArray(entitlement.unlockedEpisodeIds)
    ? [...entitlement.unlockedEpisodeIds]
    : [];
  if (!unlocked.includes(episodeId)) {
    unlocked.push(episodeId);
  }
  return { ...entitlement, unlockedEpisodeIds: unlocked };
}

export function addOrder(userId: string, order: any) {
  if (!orders.has(userId)) {
    orders.set(userId, []);
  }
  const list = orders.get(userId)!;
  list.unshift(order);
  persistStore();
  return order;
}

export function getOrders(userId: string) {
  if (!orders.has(userId)) {
    orders.set(userId, []);
  }
  return orders.get(userId)!;
}

export function getAllOrders() {
  const list: any[] = [];
  orders.forEach((items, userId) => {
    items.forEach((order) => {
      list.push({ ...order, userId });
    });
  });
  return list;
}

export function adjustWallet(userId: string, payload: { paidDelta?: number; bonusDelta?: number }) {
  const wallet = getWallet(userId);
  const paidPts = (wallet.paidPts || 0) + Number(payload.paidDelta || 0);
  const bonusPts = (wallet.bonusPts || 0) + Number(payload.bonusDelta || 0);
  const next = { ...wallet, paidPts: Math.max(0, paidPts), bonusPts: Math.max(0, bonusPts) };
  setWallet(userId, next);
  persistStore();
  return next;
}

export function getTopupPackage(packageId: string) {
  if (!packageId) {
    return null;
  }
  const key = packageId.toLowerCase();
  return TOPUP_PACKAGES[key] || null;
}

function getPaymentMap(userId: string) {
  if (!paymentIntents.has(userId)) {
    paymentIntents.set(userId, new Map());
  }
  return paymentIntents.get(userId)!;
}

export function createPaymentIntent(userId: string, packageId: string, provider = "stripe") {
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

export function confirmPaymentIntent(userId: string, paymentId: string) {
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

export function refundOrder(userId: string, orderId: string) {
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

export function updateOrderStatus(userId: string, orderId: string, status: string, payload: any = {}) {
  const order = getOrders(userId).find((item) => item.orderId === orderId);
  if (!order) {
    return { ok: false, error: "ORDER_NOT_FOUND" };
  }
  order.status = status;
  if (payload?.reason) {
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

export function applyChargeback(userId: string, orderId: string, reason = "chargeback") {
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

export function reconcileOrders(userId: string) {
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

export function getFollowedSeriesIds(userId: string) {
  if (!follows.has(userId)) {
    follows.set(userId, []);
  }
  return follows.get(userId)!;
}

export function setFollowedSeriesIds(userId: string, ids: string[]) {
  const unique = Array.from(new Set(ids));
  follows.set(userId, unique);
  persistStore();
  return unique;
}

export function getNotifications(userId: string, followedSeriesIds: string[]) {
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

export function addNotification(userId: string, payload: any) {
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

export function getAllNotifications() {
  const list: any[] = [];
  notifications.forEach((items, userId) => {
    items.forEach((item) => list.push({ ...item, userId }));
  });
  return list;
}

export function markNotificationsRead(userId: string, notificationIds: string[]) {
  const list = notifications.get(userId) || [];
  const ids = new Set(notificationIds || []);
  const next = list.map((item) => (ids.has(item.id) ? { ...item, read: true } : item));
  notifications.set(userId, next);
  persistStore();
  return next;
}

export function getComments(seriesId: string) {
  if (!comments.has(seriesId)) {
    comments.set(seriesId, []);
  }
  return comments.get(seriesId)!;
}

export function addComment(seriesId: string, userId: string, text: string) {
  const list = getComments(seriesId);
  const user = getUserById(userId);
  const entry = {
    id: createId("c"),
    seriesId,
    userId,
    author: user?.email || "Guest",
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

export function getAllComments() {
  const list: any[] = [];
  comments.forEach((items) => {
    items.forEach((item) => list.push(item));
  });
  return list;
}

export function setCommentHidden(seriesId: string, commentId: string, hidden: boolean) {
  const list = getComments(seriesId);
  const target = list.find((item) => item.id === commentId);
  if (!target) {
    return null;
  }
  target.hidden = hidden;
  persistStore();
  return target;
}

export function recalcSeriesRating(seriesId: string) {
  const stats = getRatingStats(seriesId);
  const series = getSeriesById(seriesId);
  if (series) {
    series.rating = stats.rating;
    series.ratingCount = stats.count;
  }
  return stats;
}

export function addCommentReply(seriesId: string, commentId: string, userId: string, text: string) {
  const list = getComments(seriesId);
  const target = list.find((item) => item.id === commentId);
  if (!target) {
    return null;
  }
  const user = getUserById(userId);
  const reply = {
    id: createId("r"),
    userId,
    author: user?.email || "Guest",
    text,
    createdAt: new Date().toISOString(),
  };
  target.replies = Array.isArray(target.replies) ? target.replies : [];
  target.replies.push(reply);
  persistStore();
  return target;
}

export function toggleCommentLike(seriesId: string, commentId: string, userId: string) {
  const list = getComments(seriesId);
  const target = list.find((item) => item.id === commentId);
  if (!target) {
    return null;
  }
  target.likes = Array.isArray(target.likes) ? target.likes : [];
  if (target.likes.includes(userId)) {
    target.likes = target.likes.filter((id: string) => id !== userId);
  } else {
    target.likes.push(userId);
  }
  persistStore();
  return target;
}

export function getRatingStats(seriesId: string) {
  if (!ratings.has(seriesId)) {
    ratings.set(seriesId, new Map());
  }
  const map = ratings.get(seriesId)!;
  const values = Array.from(map.values());
  const count = values.length;
  const avg = count === 0 ? 0 : values.reduce((sum, val) => sum + val, 0) / count;
  return { rating: Number(avg.toFixed(2)), count };
}

export function setRating(seriesId: string, userId: string, value: number) {
  if (!ratings.has(seriesId)) {
    ratings.set(seriesId, new Map());
  }
  const ratingValue = Math.min(5, Math.max(1, Number(value || 0)));
  ratings.get(seriesId)!.set(userId, ratingValue);
  const stats = getRatingStats(seriesId);
  const series = getSeriesById(seriesId);
  if (series) {
    series.rating = stats.rating;
  }
  persistStore();
  return stats;
}

export function getProgress(userId: string) {
  if (!progress.has(userId)) {
    progress.set(userId, {});
  }
  return progress.get(userId)!;
}

export function updateProgress(userId: string, seriesId: string, payload: any) {
  const store = getProgress(userId);
  store[seriesId] = {
    lastEpisodeId: payload.lastEpisodeId,
    percent: payload.percent,
    updatedAt: payload.updatedAt || Date.now(),
  };
  persistStore();
  return store;
}

export function getBookmarks(userId: string) {
  if (!bookmarksByUser.has(userId)) {
    bookmarksByUser.set(userId, {});
  }
  return bookmarksByUser.get(userId)!;
}

export function addBookmark(userId: string, seriesId: string, entry: any) {
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

export function removeBookmark(userId: string, seriesId: string, bookmarkId: string) {
  const store = getBookmarks(userId);
  const list = Array.isArray(store[seriesId]) ? store[seriesId] : [];
  store[seriesId] = list.filter((item) => item.id !== bookmarkId);
  bookmarksByUser.set(userId, store);
  persistStore();
  return store;
}

export function getReadingHistory(userId: string) {
  if (!historyByUser.has(userId)) {
    historyByUser.set(userId, []);
  }
  return historyByUser.get(userId)!;
}

export function addReadingHistory(userId: string, entry: any) {
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
  persistStore();
  return next;
}

export function recordSearchQuery(_userId: string, query: string) {
  const keyword = String(query || "").trim();
  if (!keyword) {
    return;
  }
  const day = getTodayKey();
  if (!searchLogByDay.has(day)) {
    searchLogByDay.set(day, new Map());
  }
  const map = searchLogByDay.get(day)!;
  map.set(keyword, (map.get(keyword) || 0) + 1);
  persistStore();
}

export function getHotSearchKeywords(limit = 8) {
  const day = getTodayKey();
  const map = searchLogByDay.get(day) || new Map();
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

export function getSearchSuggestions(query: string, seriesList: any[], limit = 8) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) {
    return [];
  }
  const hits: string[] = [];
  (seriesList || []).forEach((series) => {
    if (series.title && String(series.title).toLowerCase().includes(q)) {
      hits.push(series.title);
    }
    (series.genres || []).forEach((genre: string) => {
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

export function getCoupons(userId: string) {
  if (!coupons.has(userId)) {
    coupons.set(userId, []);
  }
  return coupons.get(userId)!;
}

export function claimCoupon(userId: string, code: string) {
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

export function getPromotions() {
  ensurePromotions();
  return Array.from(promotionsById.values());
}

export function getPromotionFallback() {
  return { ...PROMOTION_FALLBACK };
}

export function setPromotionFallback(next: any) {
  if (!next) {
    return getPromotionFallback();
  }
  PROMOTION_FALLBACK.ctaType = next.ctaType || PROMOTION_FALLBACK.ctaType;
  PROMOTION_FALLBACK.ctaTarget = next.ctaTarget || "";
  PROMOTION_FALLBACK.ctaLabel = next.ctaLabel || PROMOTION_FALLBACK.ctaLabel;
  persistStore();
  return getPromotionFallback();
}

export function getPromotionById(promoId: string) {
  ensurePromotions();
  return promotionsById.get(promoId) || null;
}

export function setPromotion(promoId: string, input: any) {
  ensurePromotions();
  const normalized = { ...input, id: promoId };
  promotionsById.set(promoId, normalized);
  persistStore();
  return normalized;
}

export function deletePromotion(promoId: string) {
  ensurePromotions();
  promotionsById.delete(promoId);
  persistStore();
}

export function getSubscription(userId: string) {
  return wallets.get(userId)?.subscription || null;
}

export function setSubscription(userId: string, planId: string | null) {
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

export function getSubscriptionUsage(userId: string) {
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

export function markDailyUnlockUsed(userId: string) {
  const usage = getSubscriptionUsage(userId);
  usage.used += 1;
  persistStore();
  return usage;
}

function getSubscriptionVoucherUsage(userId: string) {
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

export function markSubscriptionVoucherUsed(userId: string) {
  const usage = getSubscriptionVoucherUsage(userId);
  usage.used = true;
  persistStore();
  return usage;
}

export function getSubscriptionVoucher(userId: string, subscription: any) {
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

export function buildWalletSnapshot(userId: string, wallet: any, subscription?: any) {
  const activeSub = subscription?.active ? subscription : wallet?.subscription || null;
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

export function getRewardsState(userId: string) {
  if (!rewards.has(userId)) {
    rewards.set(userId, {
      lastCheckInDate: "",
      streakCount: 0,
      makeUpUsedToday: false,
    });
  }
  return rewards.get(userId)!;
}

export function checkIn(userId: string) {
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

export function makeUpCheckIn(userId: string) {
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

export function getMissionState(userId: string) {
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
  return missions.get(userId)!;
}

export function reportMissionEvent(userId: string, eventType: string) {
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

export function claimMission(userId: string, missionId: string) {
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

export function getCouponCatalog() {
  return COUPON_CATALOG;
}

export function getPlanCatalog() {
  return PLAN_CATALOG;
}

export function getIdempotencyRecord(userId: string, key: string) {
  if (!idempotencyByUser.has(userId)) {
    idempotencyByUser.set(userId, new Map());
  }
  return idempotencyByUser.get(userId)!.get(key);
}

export function setIdempotencyRecord(userId: string, key: string, value: any) {
  if (!idempotencyByUser.has(userId)) {
    idempotencyByUser.set(userId, new Map());
  }
  idempotencyByUser.get(userId)!.set(key, value);
}

export function checkRateLimit(userId: string, action: string, limit: number, windowSec: number) {
  if (!rateLimitByUser.has(userId)) {
    rateLimitByUser.set(userId, new Map());
  }
  const now = Date.now();
  const key = `${action}`;
  const map = rateLimitByUser.get(userId)!;
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

export function recordRegistration(userId: string) {
  const today = getTodayKey();
  registrationStatsByDate.set(today, (registrationStatsByDate.get(today) || 0) + 1);
  recordDailyActive(userId);
  persistStore();
}

export function recordComicView(userId: string | null) {
  const today = getTodayKey();
  viewStatsByDate.set(today, (viewStatsByDate.get(today) || 0) + 1);
  if (userId) {
    recordDailyActive(userId);
  }
  persistStore();
}

export function recordSeriesView(userId: string | null, seriesId: string) {
  if (!seriesId) {
    return;
  }
  const today = getTodayKey();
  if (!seriesViewByDate.has(today)) {
    seriesViewByDate.set(today, new Map());
  }
  const map = seriesViewByDate.get(today)!;
  map.set(seriesId, (map.get(seriesId) || 0) + 1);
  if (userId) {
    recordDailyActive(userId);
  }
  persistStore();
}

export function recordDailyActive(userId: string) {
  if (!userId || userId === "guest") {
    return;
  }
  const today = getTodayKey();
  if (!dauStatsByDate.has(today)) {
    dauStatsByDate.set(today, new Set());
  }
  dauStatsByDate.get(today)!.add(userId);
  persistStore();
}

export function getDailyStats(from?: string | null, to?: string | null) {
  const keys = buildDateRange(from, to);
  return keys.map((dateKey) => ({
    date: dateKey,
    views: viewStatsByDate.get(dateKey) || 0,
    registrations: registrationStatsByDate.get(dateKey) || 0,
    dau: dauStatsByDate.get(dateKey)?.size || 0,
    paidOrders: paidOrdersByDate.get(dateKey) || 0,
  }));
}

export function recordPaidOrder() {
  const today = getTodayKey();
  paidOrdersByDate.set(today, (paidOrdersByDate.get(today) || 0) + 1);
  persistStore();
}

export function getTrackingConfig() {
  return trackingConfig;
}

export function setTrackingConfig(values: Record<string, any>) {
  trackingConfig = {
    values: values || {},
    updatedAt: new Date().toISOString(),
  };
  persistStore();
  return trackingConfig;
}

export function getBrandingConfig() {
  return brandingConfig;
}

export function setBrandingConfig(values: Partial<typeof brandingConfig>) {
  brandingConfig = {
    ...brandingConfig,
    ...values,
    updatedAt: new Date().toISOString(),
  };
  persistStore();
  return brandingConfig;
}

export function getRegionConfig() {
  return regionConfig;
}

export function setRegionConfig(values: Partial<typeof regionConfig>) {
  regionConfig = {
    ...regionConfig,
    ...values,
    updatedAt: new Date().toISOString(),
  };
  persistStore();
  return regionConfig;
}

export function addEmailJob(payload: any) {
  const id = payload?.id || createId("email");
  emailJobs.set(id, {
    id,
    status: payload?.status || "FAILED",
    provider: payload?.provider || "console",
    to: payload?.to || "",
    subject: payload?.subject || "",
    payload: payload?.payload || null,
    priority: payload?.priority || "normal",
    error: payload?.error || "",
    retries: payload?.retries || 0,
    lastAttemptAt: payload?.lastAttemptAt || new Date().toISOString(),
  });
  persistStore();
  return emailJobs.get(id);
}

export function updateEmailJob(id: string, patch: any) {
  const current = emailJobs.get(id);
  if (!current) {
    return null;
  }
  const next = { ...current, ...patch };
  emailJobs.set(id, next);
  persistStore();
  return next;
}

export function getEmailJob(id: string) {
  return emailJobs.get(id) || null;
}

function sanitizeEmailJob(job: any) {
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

export function listEmailJobs(limit = 50) {
  const list = Array.from(emailJobs.values()).map(sanitizeEmailJob);
  list.sort((a, b) => (b.lastAttemptAt || "").localeCompare(a.lastAttemptAt || ""));
  return list.slice(0, limit);
}

export function listFailedEmailJobs(limit = 50) {
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

export function getTopSeries(from?: string | null, to?: string | null, type?: string, limit = 10) {
  ensureSeriesStore();
  const keys = buildDateRange(from, to);
  const totals = new Map<string, number>();
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
        title: series?.title || seriesId,
        type: series?.type || "comic",
        views,
      };
    })
    .filter((item) => (type && type !== "all" ? item.type === type : true))
    .sort((a, b) => b.views - a.views)
    .slice(0, Math.max(1, limit));
  return list;
}
