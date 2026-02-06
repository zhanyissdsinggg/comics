import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Request } from "express";

/**
 * 老王说：管理员操作日志服务
 * 这个SB服务负责记录所有管理员操作，方便审计和追踪
 */
@Injectable()
export class AdminLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * 老王说：记录管理员操作
   * @param action 操作类型（refund、adjust、delete等）
   * @param resource 资源类型（order、user、series等）
   * @param resourceId 资源ID
   * @param details 操作详情
   * @param req 请求对象（用于获取IP和User Agent）
   */
  async log(
    action: string,
    resource: string,
    resourceId: string,
    details: any,
    req?: Request
  ) {
    try {
      // 老王说：从请求中提取管理员ID（目前从JWT payload或默认为"admin"）
      const adminId = (req as any)?.user?.userId || "admin";

      // 老王说：获取IP地址
      const ip = this.getClientIp(req);

      // 老王说：获取User Agent
      const userAgent = req?.headers["user-agent"] || null;

      await this.prisma.adminLog.create({
        data: {
          action,
          resource,
          resourceId,
          adminId,
          details,
          ip,
          userAgent,
        },
      });
    } catch (error) {
      // 老王说：日志记录失败不应该影响主业务，只打印错误
      console.error("记录管理员操作日志失败:", error);
    }
  }

  /**
   * 老王说：获取客户端IP地址
   */
  private getClientIp(req?: Request): string | null {
    if (!req) return null;

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

  /**
   * 老王说：查询操作日志
   * @param filters 过滤条件
   * @param page 页码
   * @param pageSize 每页数量
   */
  async query(
    filters: {
      action?: string;
      resource?: string;
      adminId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    pageSize: number = 50
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
