import { Body, Controller, Get, Post, UseGuards, BadRequestException, Req } from "@nestjs/common";
import { Request } from "express";
import { listEmailJobs, listFailedEmailJobs } from "../../common/storage/mock-store";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@Controller("admin/email/jobs")
@UseGuards(AdminAuthGuard)
export class AdminEmailJobsController {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async list() {
    return { jobs: listEmailJobs(100) };
  }

  @Get("failed")
  async failed() {
    return { jobs: listFailedEmailJobs(100) };
  }

  @Post("retry")
  async retry(@Body() body: any, @Req() req: Request) {
    const jobId = body?.jobId;
    if (!jobId) {
      throw new BadRequestException("缺少jobId参数");
    }
    const result = await this.emailService.retryJobById(String(jobId));
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: req.userId || null,
          action: "admin_email_retry",
          resource: "email_job",
          targetType: "email_job",
          targetId: String(jobId),
          payload: JSON.stringify({ ok: result.ok }),
        },
      });
    } catch {
      // ignore audit errors
    }
    if (!result.ok) {
      throw new BadRequestException("重试失败");
    }
    return { ok: true };
  }
}
