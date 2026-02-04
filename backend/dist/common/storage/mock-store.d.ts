export type SeriesType = "comic" | "novel";
export declare const seriesCatalog: ({
    id: string;
    title: string;
    type: SeriesType;
    adult: boolean;
    coverTone: string;
    badge: string;
    latest: string;
    genres: string[];
    status: string;
    rating: number;
    description: string;
    pricing: {
        currency: string;
        episodePrice: number;
        discount: number;
    };
    ttf: {
        enabled: boolean;
        intervalHours: number;
    };
    hasFreeEpisodes: boolean;
    freeEpisodeCount: number;
    bannerUrl: string;
} | {
    id: string;
    title: string;
    type: SeriesType;
    adult: boolean;
    coverTone: string;
    badge: string;
    latest: string;
    genres: string[];
    status: string;
    rating: number;
    description: string;
    pricing: {
        currency: string;
        episodePrice: number;
        discount: number;
    };
    ttf: {
        enabled: boolean;
        intervalHours: number;
    };
    hasFreeEpisodes: boolean;
    freeEpisodeCount: number;
    bannerUrl?: undefined;
})[];
declare let brandingConfig: {
    siteLogoUrl: string;
    faviconUrl: string;
    homeBannerUrl: string;
    updatedAt: string | null;
};
declare let regionConfig: {
    countryCodes: {
        code: string;
        label: string;
    }[];
    lengthRules: Record<string, number[]>;
    updatedAt: string | null;
};
export declare function createId(prefix: string): string;
export declare function createUser(email: string, password: string): {
    id: string;
    email: string;
    password: string;
    isBlocked: boolean;
};
export declare function getAllUserIds(): string[];
export declare function getAllUsers(): any[];
export declare function validateUser(email: string, password: string): any;
export declare function getUserById(userId: string): any;
export declare function setUserBlocked(userId: string, blocked: boolean): any;
export declare function createSession(userId: string): string;
export declare function deleteSession(token: string): void;
export declare function getSessionUserId(sessionToken: string | undefined): string;
export declare function getSeriesList(): any[];
export declare function getSeriesById(seriesId: string): any;
export declare function getSeriesEpisodes(seriesId: string): any[];
export declare function getSeriesEpisodesForUser(seriesId: string, subscription: any): any[];
export declare function setSeries(seriesId: string, input: any): {
    id: any;
    title: any;
    type: any;
    adult: boolean;
    coverTone: any;
    coverUrl: any;
    badge: any;
    badges: any;
    latest: any;
    latestEpisodeId: any;
    genres: any;
    status: any;
    isPublished: boolean;
    isFeatured: boolean;
    rating: number;
    ratingCount: number;
    description: any;
    pricing: {
        currency: any;
        episodePrice: number;
        discount: number;
    };
    ttf: {
        enabled: boolean;
        intervalHours: number;
    };
};
export declare function deleteSeries(seriesId: string): void;
export declare function setSeriesEpisodes(seriesId: string, episodes: any[]): {
    id: any;
    seriesId: string;
    number: number;
    title: any;
    releasedAt: any;
    pricePts: number;
    ttfEligible: boolean;
    ttfReadyAt: any;
    previewFreePages: number;
    pages: any;
    paragraphs: any;
    text: any;
}[];
export declare function upsertEpisode(seriesId: string, input: any): {
    id: any;
    seriesId: string;
    number: number;
    title: any;
    releasedAt: any;
    pricePts: number;
    ttfEligible: boolean;
    ttfReadyAt: any;
    previewFreePages: number;
    pages: any;
    paragraphs: any;
    text: any;
};
export declare function deleteEpisode(seriesId: string, episodeId: string): any[];
export declare function bulkGenerateEpisodes(seriesId: string, count: number, baseProps?: any): {
    id: any;
    seriesId: string;
    number: number;
    title: any;
    releasedAt: any;
    pricePts: number;
    ttfEligible: boolean;
    ttfReadyAt: any;
    previewFreePages: number;
    pages: any;
    paragraphs: any;
    text: any;
}[];
export declare function getEpisodeById(seriesId: string, episodeId: string): any;
export declare function getWallet(userId: string): any;
export declare function setWallet(userId: string, wallet: any): any;
export declare function chargeWallet(wallet: any, pricePts: number): {
    ok: boolean;
    shortfallPts: number;
    wallet?: undefined;
} | {
    ok: boolean;
    wallet: any;
    shortfallPts?: undefined;
};
export declare function getEntitlement(userId: string, seriesId: string): any;
export declare function setEntitlement(userId: string, seriesId: string, entitlement: any): any;
export declare function applyUnlock(entitlement: any, episodeId: string): any;
export declare function addOrder(userId: string, order: any): any;
export declare function getOrders(userId: string): any[];
export declare function getAllOrders(): any[];
export declare function adjustWallet(userId: string, payload: {
    paidDelta?: number;
    bonusDelta?: number;
}): any;
export declare function getTopupPackage(packageId: string): any;
export declare function createPaymentIntent(userId: string, packageId: string, provider?: string): {
    order: {
        orderId: string;
        packageId: any;
        amount: any;
        currency: string;
        status: string;
        createdAt: string;
        provider: string;
        paidPts: any;
        bonusPts: any;
    };
    payment: {
        paymentId: string;
        orderId: string;
        provider: string;
        status: string;
        createdAt: string;
    };
};
export declare function confirmPaymentIntent(userId: string, paymentId: string): {
    ok: boolean;
    error: string;
    order?: undefined;
    wallet?: undefined;
} | {
    ok: boolean;
    order: any;
    wallet: any;
    error?: undefined;
};
export declare function refundOrder(userId: string, orderId: string): {
    ok: boolean;
    error: string;
    order?: undefined;
    wallet?: undefined;
    refundShortfall?: undefined;
} | {
    ok: boolean;
    order: any;
    wallet: any;
    refundShortfall: any;
    error?: undefined;
};
export declare function updateOrderStatus(userId: string, orderId: string, status: string, payload?: any): {
    ok: boolean;
    error: string;
    order?: undefined;
} | {
    ok: boolean;
    order: any;
    error?: undefined;
};
export declare function applyChargeback(userId: string, orderId: string, reason?: string): {
    ok: boolean;
    error: string;
    order?: undefined;
    wallet?: undefined;
    refundShortfall?: undefined;
} | {
    ok: boolean;
    order: any;
    wallet: any;
    error?: undefined;
    refundShortfall?: undefined;
} | {
    ok: boolean;
    order: any;
    wallet: any;
    refundShortfall: any;
    error?: undefined;
};
export declare function reconcileOrders(userId: string): {
    updated: number;
    orders: any[];
};
export declare function getFollowedSeriesIds(userId: string): string[];
export declare function setFollowedSeriesIds(userId: string, ids: string[]): string[];
export declare function getNotifications(userId: string, followedSeriesIds: string[]): any[];
export declare function addNotification(userId: string, payload: any): {
    id: string;
    type: any;
    title: any;
    message: any;
    seriesId: any;
    episodeId: any;
    createdAt: string;
    read: boolean;
    ctaType: any;
    ctaLabel: any;
    ctaTarget: any;
};
export declare function getAllNotifications(): any[];
export declare function markNotificationsRead(userId: string, notificationIds: string[]): any[];
export declare function getComments(seriesId: string): any[];
export declare function addComment(seriesId: string, userId: string, text: string): {
    id: string;
    seriesId: string;
    userId: string;
    author: any;
    text: string;
    createdAt: string;
    likes: any[];
    hidden: boolean;
    replies: any[];
};
export declare function getAllComments(): any[];
export declare function setCommentHidden(seriesId: string, commentId: string, hidden: boolean): any;
export declare function recalcSeriesRating(seriesId: string): {
    rating: number;
    count: number;
};
export declare function addCommentReply(seriesId: string, commentId: string, userId: string, text: string): any;
export declare function toggleCommentLike(seriesId: string, commentId: string, userId: string): any;
export declare function getRatingStats(seriesId: string): {
    rating: number;
    count: number;
};
export declare function setRating(seriesId: string, userId: string, value: number): {
    rating: number;
    count: number;
};
export declare function getProgress(userId: string): Record<string, any>;
export declare function updateProgress(userId: string, seriesId: string, payload: any): Record<string, any>;
export declare function getBookmarks(userId: string): Record<string, any[]>;
export declare function addBookmark(userId: string, seriesId: string, entry: any): Record<string, any[]>;
export declare function removeBookmark(userId: string, seriesId: string, bookmarkId: string): Record<string, any[]>;
export declare function getReadingHistory(userId: string): any[];
export declare function addReadingHistory(userId: string, entry: any): any[];
export declare function recordSearchQuery(_userId: string, query: string): void;
export declare function getHotSearchKeywords(limit?: number): any[];
export declare function getSearchSuggestions(query: string, seriesList: any[], limit?: number): any[];
export declare function getCoupons(userId: string): any[];
export declare function claimCoupon(userId: string, code: string): {
    ok: boolean;
    message: string;
    coupons?: undefined;
} | {
    ok: boolean;
    coupons: any[];
    message?: undefined;
};
export declare function getPromotions(): any[];
export declare function getPromotionFallback(): {
    ctaType: string;
    ctaTarget: string;
    ctaLabel: string;
};
export declare function setPromotionFallback(next: any): {
    ctaType: string;
    ctaTarget: string;
    ctaLabel: string;
};
export declare function getPromotionById(promoId: string): any;
export declare function setPromotion(promoId: string, input: any): any;
export declare function deletePromotion(promoId: string): void;
export declare function getSubscription(userId: string): any;
export declare function setSubscription(userId: string, planId: string | null): {
    active: boolean;
    planId: any;
    startedAt: string;
    renewAt: string;
    perks: {
        discountPct: any;
        dailyFreeUnlocks: any;
        ttfMultiplier: any;
        voucherPts: any;
    };
};
export declare function getSubscriptionUsage(userId: string): any;
export declare function markDailyUnlockUsed(userId: string): any;
export declare function markSubscriptionVoucherUsed(userId: string): any;
export declare function getSubscriptionVoucher(userId: string, subscription: any): {
    id: string;
    code: string;
    type: string;
    value: number;
    remainingUses: number;
    label: string;
    source: string;
};
export declare function buildWalletSnapshot(userId: string, wallet: any, subscription?: any): any;
export declare function getRewardsState(userId: string): any;
export declare function checkIn(userId: string): {
    ok: boolean;
    error: string;
    state: any;
} | {
    ok: boolean;
    state: any;
    error?: undefined;
};
export declare function makeUpCheckIn(userId: string): {
    ok: boolean;
    error: string;
    state?: undefined;
} | {
    ok: boolean;
    state: any;
    error?: undefined;
};
export declare function getMissionState(userId: string): any;
export declare function reportMissionEvent(userId: string, eventType: string): any;
export declare function claimMission(userId: string, missionId: string): {
    ok: boolean;
    error: string;
    reward?: undefined;
    state?: undefined;
} | {
    ok: boolean;
    reward: any;
    state: any;
    error?: undefined;
};
export declare function getCouponCatalog(): Record<string, any>;
export declare function getPlanCatalog(): Record<string, any>;
export declare function getIdempotencyRecord(userId: string, key: string): any;
export declare function setIdempotencyRecord(userId: string, key: string, value: any): void;
export declare function checkRateLimit(userId: string, action: string, limit: number, windowSec: number): {
    ok: boolean;
    retryAfterSec: number;
};
export declare function recordRegistration(userId: string): void;
export declare function recordComicView(userId: string | null): void;
export declare function recordSeriesView(userId: string | null, seriesId: string): void;
export declare function recordDailyActive(userId: string): void;
export declare function getDailyStats(from?: string | null, to?: string | null): {
    date: string;
    views: number;
    registrations: number;
    dau: number;
    paidOrders: number;
}[];
export declare function recordPaidOrder(): void;
export declare function getTrackingConfig(): {
    values: Record<string, any>;
    updatedAt: string | null;
};
export declare function setTrackingConfig(values: Record<string, any>): {
    values: Record<string, any>;
    updatedAt: string | null;
};
export declare function getBrandingConfig(): {
    siteLogoUrl: string;
    faviconUrl: string;
    homeBannerUrl: string;
    updatedAt: string | null;
};
export declare function setBrandingConfig(values: Partial<typeof brandingConfig>): {
    siteLogoUrl: string;
    faviconUrl: string;
    homeBannerUrl: string;
    updatedAt: string | null;
};
export declare function getRegionConfig(): {
    countryCodes: {
        code: string;
        label: string;
    }[];
    lengthRules: Record<string, number[]>;
    updatedAt: string | null;
};
export declare function setRegionConfig(values: Partial<typeof regionConfig>): {
    countryCodes: {
        code: string;
        label: string;
    }[];
    lengthRules: Record<string, number[]>;
    updatedAt: string | null;
};
export declare function addEmailJob(payload: any): any;
export declare function updateEmailJob(id: string, patch: any): any;
export declare function getEmailJob(id: string): any;
export declare function listEmailJobs(limit?: number): {
    id: any;
    status: any;
    provider: any;
    to: any;
    subject: any;
    priority: any;
    error: any;
    retries: any;
    lastAttemptAt: any;
}[];
export declare function listFailedEmailJobs(limit?: number): {
    id: any;
    status: any;
    provider: any;
    to: any;
    subject: any;
    priority: any;
    error: any;
    retries: any;
    lastAttemptAt: any;
}[];
export declare function getTopSeries(from?: string | null, to?: string | null, type?: string, limit?: number): {
    seriesId: string;
    title: any;
    type: any;
    views: number;
}[];
export {};
