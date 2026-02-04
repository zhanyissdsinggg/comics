export declare const ERROR_CODES: {
    UNAUTHENTICATED: string;
    FORBIDDEN: string;
    INVALID_REQUEST: string;
    NOT_FOUND: string;
    ADULT_GATED: string;
    INSUFFICIENT_POINTS: string;
    TTF_NOT_READY: string;
    RATE_LIMITED: string;
    INTERNAL: string;
};
export declare function buildError(code: string, extra?: Record<string, any>): {
    error: string;
};
