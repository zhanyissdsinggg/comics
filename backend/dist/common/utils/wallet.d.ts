export declare function chargeWallet(wallet: any, pricePts: number): {
    ok: boolean;
    shortfallPts: number;
    wallet?: undefined;
} | {
    ok: boolean;
    wallet: any;
    shortfallPts?: undefined;
};
