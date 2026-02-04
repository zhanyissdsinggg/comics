export declare function parseBool(value: string | undefined): boolean;
export declare function checkAdultGate(cookies: Record<string, string>): {
    ok: boolean;
    reason: string;
};
