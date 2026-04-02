import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { listEmailJobs, listFailedEmailJobs } from "../../../../common/storage/mock-store";
import { EmailService } from "../../../email/email.service";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";
import { RetryEmailJobDto } from "../dtos/admin-system.dto";

@Controller("admin/email/jobs")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.EMAIL_JOB_READ)
export class AdminEmailJobsController {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
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
  @RequireAdminPermissions(AdminPermission.EMAIL_JOB_UPDATE)
  async retry(@Body() body: RetryEmailJobDto, @Req() req: Request) {
    const jobId = body?.jobId;
    if (!jobId) {
      throw new BadRequestException("Missing jobId");
    }

    const result = await this.emailService.retryJobById(String(jobId));

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: (req as any)?.user?.userId || "admin",
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
      throw new BadRequestException("Retry failed");
    }

    return { ok: true };
  }
}
