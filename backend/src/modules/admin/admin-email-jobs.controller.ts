import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { listEmailJobs, listFailedEmailJobs } from "../../common/storage/mock-store";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("admin/email/jobs")
export class AdminEmailJobsController {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async list(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    return { jobs: listEmailJobs(100) };
  }

  @Get("failed")
  async failed(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    return { jobs: listFailedEmailJobs(100) };
  }

  @Post("retry")
  async retry(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!isAdminAuthorized(req, body)) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }
    const jobId = body?.jobId;
    if (!jobId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const result = await this.emailService.retryJobById(String(jobId));
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: req.userId || null,
          action: "admin_email_retry",
          targetType: "email_job",
          targetId: String(jobId),
          payload: { ok: result.ok },
          requestId: req.requestId || "",
        },
      });
    } catch {
      // ignore audit errors
    }
    if (!result.ok) {
      res.status(400);
      return buildError(ERROR_CODES.INTERNAL);
    }
    return { ok: true };
  }
}
