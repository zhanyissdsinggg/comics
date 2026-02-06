import { Request, Response } from "express";
import { AdminLogService } from "../../common/services/admin-log.service";
export declare class AdminLogsController {
    private readonly adminLogService;
    constructor(adminLogService: AdminLogService);
    query(query: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
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
