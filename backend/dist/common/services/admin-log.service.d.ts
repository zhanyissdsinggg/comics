import { PrismaService } from "../prisma/prisma.service";
import { Request } from "express";
export declare class AdminLogService {
    private prisma;
    constructor(prisma: PrismaService);
    log(action: string, resource: string, resourceId: string, details: any, req?: Request): Promise<void>;
    private getClientIp;
    query(filters: {
        action?: string;
        resource?: string;
        adminId?: string;
        startDate?: Date;
        endDate?: Date;
    }, page?: number, pageSize?: number): Promise<{
        logs: {
            id: string;
            action: string;
            resource: string;
            resourceId: string;
            adminId: string;
            details: import("@prisma/client/runtime/library").JsonValue | null;
            ip: string | null;
            userAgent: string | null;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
}
