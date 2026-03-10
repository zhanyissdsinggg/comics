import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { logger } from "../logger/winston.init";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    action: string,
    resource: string,
    resourceId: string,
    details: any,
    req?: Request,
  ) {
    try {
      const requestLike = req as Request & {
        userId?: string;
        user?: { userId?: string };
      };
      const adminId = requestLike?.userId || requestLike?.user?.userId || "admin";
      const ip = this.getClientIp(req);
      const userAgent = req?.headers["user-agent"] || null;

      await this.prisma.adminLog.create({
        data: {
          userId: adminId,
          action,
          resource,
          resourceId,
          adminId,
          details: details ? JSON.stringify(details) : null,
          ip,
          userAgent,
        },
      });
    } catch (error) {
      logger.error("Failed to record admin log", { error });
    }
  }

  private getClientIp(req?: Request): string | null {
    if (!req) {
      return null;
    }

    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }

    const realIp = req.headers["x-real-ip"];
    if (typeof realIp === "string") {
      return realIp;
    }

    return req.socket?.remoteAddress || null;
  }

  async query(
    filters: {
      action?: string;
      resource?: string;
      adminId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    pageSize: number = 50,
  ) {
    const where: any = {};

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resource) {
      where.resource = filters.resource;
    }

    if (filters.adminId) {
      where.adminId = filters.adminId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.adminLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
