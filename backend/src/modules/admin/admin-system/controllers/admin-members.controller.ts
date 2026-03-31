import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AdminAudit } from "../../decorators/admin-audit.decorator";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";
import { CreateAdminMemberDto, UpdateAdminMemberDto } from "../dtos/admin-system.dto";
import { AdminMembersService } from "../services/admin-members.service";

@Controller("admin/members")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.ADMIN_MEMBER_READ)
export class AdminMembersController {
  constructor(private readonly adminMembersService: AdminMembersService) {}

  @Get()
  async list(@Req() req: Request) {
    return this.adminMembersService.listMembers(req.query as Record<string, unknown>);
  }

  @Get("meta")
  async meta() {
    return this.adminMembersService.getMeta();
  }

  @Post("sync-env")
  @AdminAudit("sync", "admin_member")
  @RequireAdminPermissions(AdminPermission.ADMIN_MEMBER_UPDATE)
  async syncEnv() {
    return this.adminMembersService.syncMembersFromEnv();
  }

  @Post()
  @AdminAudit("create", "admin_member")
  @RequireAdminPermissions(AdminPermission.ADMIN_MEMBER_CREATE)
  async create(@Body() body: CreateAdminMemberDto) {
    return {
      member: await this.adminMembersService.createMember(
        (body?.member || body) as Record<string, unknown>,
      ),
    };
  }

  @Patch(":id")
  @AdminAudit("update", "admin_member")
  @RequireAdminPermissions(AdminPermission.ADMIN_MEMBER_UPDATE)
  async update(@Param("id") id: string, @Body() body: UpdateAdminMemberDto) {
    return {
      member: await this.adminMembersService.updateMember(
        id,
        (body?.member || body) as Record<string, unknown>,
      ),
    };
  }

  @Patch(":id/status")
  @AdminAudit("update_status", "admin_member")
  @RequireAdminPermissions(AdminPermission.ADMIN_MEMBER_UPDATE)
  async updateStatus(@Param("id") id: string, @Body() body: { status?: string }) {
    return {
      member: await this.adminMembersService.setMemberStatus(id, String(body?.status || "")),
    };
  }

  @Post(":id/reset-2fa")
  @AdminAudit("reset_2fa", "admin_member")
  @RequireAdminPermissions(AdminPermission.ADMIN_MEMBER_UPDATE)
  async resetTwoFactor(@Param("id") id: string) {
    return this.adminMembersService.regenerateMemberTotp(id);
  }

  @Delete(":id/2fa")
  @AdminAudit("clear_2fa", "admin_member")
  @RequireAdminPermissions(AdminPermission.ADMIN_MEMBER_UPDATE)
  async clearTwoFactor(@Param("id") id: string) {
    return {
      member: await this.adminMembersService.clearMemberTotp(id),
    };
  }
}
