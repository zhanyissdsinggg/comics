type PersistPayload = {
    usersByEmail?: Record<string, any>;
    usersById?: Record<string, any>;
    sessions?: Record<string, string>;
    wallets?: Record<string, any>;
    entitlements?: Record<string, Record<string, any>>;
    orders?: Record<string, any[]>;
    paymentIntents?: Record<string, Record<string, any>>;
    progress?: Record<string, Record<string, any>>;
    seriesById?: Record<string, any>;
    episodesBySeriesId?: Record<string, any[]>;
    promotionsById?: Record<string, any>;
    coupons?: Record<string, any[]>;
    rewards?: Record<string, any>;
    missions?: Record<string, any>;
    follows?: Record<string, any[]>;
    notifications?: Record<string, any[]>;
    comments?: Record<string, any[]>;
    ratings?: Record<string, Record<string, number>>;
    subscriptionUsage?: Record<string, any>;
    subscriptionVoucher?: Record<string, any>;
    bookmarks?: Record<string, Record<string, any[]>>;
    history?: Record<string, any[]>;
    trackingConfig?: {
        values: Record<string, any>;
        updatedAt: string | null;
    };
    brandingConfig?: {
        siteLogoUrl: string;
        faviconUrl: string;
        homeBannerUrl: string;
        updatedAt: string | null;
    };
    regionConfig?: {
        countryCodes: {
            code: string;
            label: string;
        }[];
        lengthRules: Record<string, number[]>;
        updatedAt: string | null;
    };
    emailJobs?: Record<string, any>;
    searchLog?: Record<string, Record<string, number>>;
    viewStatsByDate?: Record<string, number>;
    registrationStatsByDate?: Record<string, number>;
    dauStatsByDate?: Record<string, string[]>;
    paidOrdersByDate?: Record<string, number>;
    seriesViewByDate?: Record<string, Record<string, number>>;
};
export declare function readPersistedStore(): PersistPayload;
export declare function schedulePersist(payload: PersistPayload): void;
export {};
