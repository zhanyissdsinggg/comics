type CookieOptions = {
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
    path?: string;
    domain?: string;
    maxAge?: number;
};
export declare function buildCookieOptions(overrides?: CookieOptions): CookieOptions;
export {};
