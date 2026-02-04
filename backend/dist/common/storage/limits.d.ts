type IdempotencyRecord = {
    status?: number;
    body?: any;
    createdAt: number;
};
export declare function getIdempotencyRecord(prisma: any, userId: string, key: string): Promise<IdempotencyRecord | {
    status: any;
    body: any;
}>;
export declare function setIdempotencyRecord(prisma: any, userId: string, key: string, value: any): Promise<void>;
export declare function checkRateLimit(prisma: any, userId: string, action: string, limit: number, windowSec: number): Promise<{
    ok: boolean;
    retryAfterSec: number;
}>;
export declare function checkRateLimitByIp(prisma: any, ip: string, action: string, limit: number, windowSec: number): Promise<{
    ok: boolean;
    retryAfterSec: number;
}>;
export {};
