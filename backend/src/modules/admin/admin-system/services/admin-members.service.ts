import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { AdminMember, Prisma } from "@prisma/client";
import { getAppConfig } from "../../../../common/config/app-config";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { buildPaginationResult, calculateOffset, parsePaginationParams } from "../../../../common/utils/pagination";
import {
  buildTotpProvisioningUri,
  generateTotpSecret,
  getAdminIdentityFromKey,
  getAdminKeySlot,
  getAdminKeysFromEnv,
  getAdminRoleFromKey,
  verifyTotpCodeWithSecret,
} from "../../../../common/utils/admin-security";
import { AdminRole, buildAdminSessionProfile, normalizeAdminRole } from "../../permissions/admin-permissions";

const ADMIN_MEMBER_STATUS_ACTIVE = "active";
const ADMIN_MEMBER_STATUS_DISABLED = "disabled";
const ADMIN_MEMBER_STATUS_VALUES = new Set([
  ADMIN_MEMBER_STATUS_ACTIVE,
  ADMIN_MEMBER_STATUS_DISABLED,
]);
const ADMIN_MEMBER_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "lastLoginAt",
  "name",
  "email",
  "role",
  "status",
  "keySlot",
]);

export type AdminMemberRecord = {
  id: string;
  name: string;
  email: string | null;
  role: AdminRole;
  status: string;
  keySlot: number | null;
  keySlotStatus: "assigned" | "unassigned" | "missing";
  source: string;
  totpEnabled: boolean;
  hasTotpSecret: boolean;
  notes: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminMemberMeta = {
  keySlots: Array<{
    slot: number;
    configuredRole: AdminRole;
    assignedMemberId: string | null;
    assignedMemberName: string | null;
  }>;
  roleOptions: AdminRole[];
  statusOptions: string[];
};

function sanitizeText(value: unknown): string {
  return String(value || "").trim();
}

function sanitizeOptionalText(value: unknown): string | null {
  const normalized = sanitizeText(value);
  return normalized ? normalized : null;
}

function normalizeMemberStatus(value: unknown, fallback = ADMIN_MEMBER_STATUS_ACTIVE): string {
  const normalized = sanitizeText(value).toLowerCase();
  return ADMIN_MEMBER_STATUS_VALUES.has(normalized) ? normalized : fallback;
}

function readBooleanFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = sanitizeText(value).toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function normalizeSortOrder(value: unknown): Prisma.SortOrder {
  return sanitizeText(value).toLowerCase() === "asc" ? "asc" : "desc";
}

@Injectable()
export class AdminMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async syncMembersFromEnv(): Promise<{ created: number; totalSlots: number }> {
    const availableSlots = this.getAvailableSlots();
    if (availableSlots.length === 0) {
      return { created: 0, totalSlots: 0 };
    }

    const existingMembers = await this.prisma.adminMember.findMany({
      where: {
        keySlot: { in: availableSlots },
      },
      select: {
        id: true,
        keySlot: true,
      },
    });
    const existingSlots = new Set(
      existingMembers
        .map((member) => member.keySlot)
        .filter((slot): slot is number => typeof slot === "number"),
    );

    let created = 0;
    for (const slot of availableSlots) {
      if (existingSlots.has(slot)) {
        continue;
      }

      await this.prisma.adminMember.create({
        data: {
          name: `后台成员 ${slot}`,
          role: this.getConfiguredRoleForSlot(slot),
          status: ADMIN_MEMBER_STATUS_ACTIVE,
          keySlot: slot,
          source: "env_seed",
        },
      });
      created += 1;
    }

    return {
      created,
      totalSlots: availableSlots.length,
    };
  }

  async listMembers(query: Record<string, unknown>) {
    await this.syncMembersFromEnv();

    const { page, pageSize } = parsePaginationParams(query);
    const offset = calculateOffset(page, pageSize);
    const search = sanitizeText(query.search);
    const status = sanitizeOptionalText(query.status);
    const role = sanitizeOptionalText(query.role);
    const sortBy = ADMIN_MEMBER_SORT_FIELDS.has(sanitizeText(query.sortBy))
      ? sanitizeText(query.sortBy)
      : "createdAt";
    const sortOrder = normalizeSortOrder(query.sortOrder);

    const where: Prisma.AdminMemberWhereInput = {};
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) {
      where.status = normalizeMemberStatus(status, status);
    }
    if (role) {
      where.role = normalizeAdminRole(role, AdminRole.SUPER_ADMIN);
    }

    const [members, total, meta] = await Promise.all([
      this.prisma.adminMember.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: pageSize,
      }),
      this.prisma.adminMember.count({ where }),
      this.getMeta(),
    ]);

    return {
      ...buildPaginationResult(members.map((member) => this.mapMember(member)), total, page, pageSize),
      meta,
    };
  }

  async getMeta(): Promise<AdminMemberMeta> {
    await this.syncMembersFromEnv();

    const members = await this.prisma.adminMember.findMany({
      where: {
        keySlot: { not: null },
      },
      select: {
        id: true,
        name: true,
        keySlot: true,
      },
    });

    const memberBySlot = new Map<number, { id: string; name: string }>();
    for (const member of members) {
      if (typeof member.keySlot === "number") {
        memberBySlot.set(member.keySlot, { id: member.id, name: member.name });
      }
    }

    return {
      keySlots: this.getAvailableSlots().map((slot) => ({
        slot,
        configuredRole: this.getConfiguredRoleForSlot(slot),
        assignedMemberId: memberBySlot.get(slot)?.id || null,
        assignedMemberName: memberBySlot.get(slot)?.name || null,
      })),
      roleOptions: Object.values(AdminRole),
      statusOptions: [ADMIN_MEMBER_STATUS_ACTIVE, ADMIN_MEMBER_STATUS_DISABLED],
    };
  }

  async createMember(input: Record<string, unknown>) {
    const name = sanitizeText(input.name);
    if (!name) {
      throw new BadRequestException("name is required");
    }

    const email = this.normalizeEmail(input.email);
    const keySlot = input.keySlot === undefined ? null : this.readKeySlot(input.keySlot);
    await this.assertEmailAvailable(email);
    await this.assertKeySlotAvailable(keySlot);

    const totpEnabled = readBooleanFlag(input.totpEnabled, false);
    const member = await this.prisma.adminMember.create({
      data: {
        name,
        email,
        role: normalizeAdminRole(input.role, AdminRole.SUPER_ADMIN),
        status: normalizeMemberStatus(input.status),
        keySlot,
        source: sanitizeOptionalText(input.source) || "manual",
        notes: sanitizeOptionalText(input.notes),
        totpEnabled,
        totpSecret: totpEnabled ? generateTotpSecret() : null,
      },
    });

    return this.mapMember(member);
  }

  async updateMember(id: string, input: Record<string, unknown>) {
    const existing = await this.prisma.adminMember.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Admin member not found");
    }

    const nextEmail = input.email !== undefined ? this.normalizeEmail(input.email) : undefined;
    const nextKeySlot = input.keySlot !== undefined ? this.readKeySlot(input.keySlot) : undefined;
    await this.assertEmailAvailable(nextEmail, id);
    await this.assertKeySlotAvailable(nextKeySlot, id);

    const nextTotpEnabled = input.totpEnabled !== undefined
      ? readBooleanFlag(input.totpEnabled, existing.totpEnabled)
      : existing.totpEnabled;

    if (nextTotpEnabled && !existing.totpSecret && input.totpEnabled !== undefined) {
      throw new BadRequestException("Generate a 2FA secret before enabling member-specific TOTP.");
    }

    const member = await this.prisma.adminMember.update({
      where: { id },
      data: {
        name: input.name !== undefined ? sanitizeText(input.name) || existing.name : undefined,
        email: nextEmail,
        role: input.role !== undefined
          ? normalizeAdminRole(input.role, AdminRole.SUPER_ADMIN)
          : undefined,
        status: input.status !== undefined
          ? normalizeMemberStatus(input.status)
          : undefined,
        keySlot: nextKeySlot,
        notes: input.notes !== undefined ? sanitizeOptionalText(input.notes) : undefined,
        totpEnabled: input.totpEnabled !== undefined ? nextTotpEnabled : undefined,
      },
    });

    return this.mapMember(member);
  }

  async setMemberStatus(id: string, status: string) {
    const existing = await this.prisma.adminMember.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Admin member not found");
    }

    const member = await this.prisma.adminMember.update({
      where: { id },
      data: {
        status: normalizeMemberStatus(status),
      },
    });

    return this.mapMember(member);
  }

  async regenerateMemberTotp(id: string) {
    const existing = await this.prisma.adminMember.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Admin member not found");
    }

    const secret = generateTotpSecret();
    const issuer = "Tappytoon Admin";
    const label = existing.email || existing.name || existing.id;
    const member = await this.prisma.adminMember.update({
      where: { id },
      data: {
        totpSecret: secret,
        totpEnabled: true,
      },
    });

    return {
      member: this.mapMember(member),
      secret,
      otpauthUrl: buildTotpProvisioningUri({
        secret,
        issuer,
        label,
      }),
    };
  }

  async clearMemberTotp(id: string) {
    const existing = await this.prisma.adminMember.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Admin member not found");
    }

    const member = await this.prisma.adminMember.update({
      where: { id },
      data: {
        totpSecret: null,
        totpEnabled: false,
      },
    });

    return this.mapMember(member);
  }

  async resolveLoginMember(adminKey: string) {
    const keySlot = getAdminKeySlot(adminKey);
    const fallbackRole = getAdminRoleFromKey(adminKey);

    if (!keySlot) {
      return {
        member: null as AdminMember | null,
        adminId: getAdminIdentityFromKey(adminKey) || "admin",
        adminRole: fallbackRole,
        session: buildAdminSessionProfile(
          getAdminIdentityFromKey(adminKey) || "admin",
          fallbackRole,
          { authMode: "legacy_env_admin_key", keySlot: null },
        ),
      };
    }

    await this.syncMembersFromEnv();
    const member = await this.prisma.adminMember.findFirst({
      where: { keySlot },
    });

    if (member && normalizeMemberStatus(member.status) !== ADMIN_MEMBER_STATUS_ACTIVE) {
      throw new UnauthorizedException("This admin member has been disabled.");
    }

    if (member) {
      return {
        member,
        adminId: member.id,
        adminRole: normalizeAdminRole(member.role, fallbackRole),
        session: this.buildMemberSession(member, fallbackRole),
      };
    }

    const adminId = getAdminIdentityFromKey(adminKey) || "admin";
    return {
      member: null as AdminMember | null,
      adminId,
      adminRole: fallbackRole,
      session: buildAdminSessionProfile(adminId, fallbackRole, {
        authMode: "legacy_env_admin_key",
        keySlot,
      }),
    };
  }

  async resolveSessionProfile(adminId: string, fallbackRole: AdminRole) {
    const member = await this.ensureActiveMember(adminId);
    if (!member) {
      return {
        member: null as AdminMember | null,
        adminRole: fallbackRole,
        session: buildAdminSessionProfile(adminId, fallbackRole, {
          authMode: "legacy_env_admin_key",
        }),
      };
    }

    return {
      member,
      adminRole: normalizeAdminRole(member.role, fallbackRole),
      session: this.buildMemberSession(member, fallbackRole),
    };
  }

  async ensureActiveMember(adminId: string): Promise<AdminMember | null> {
    const member = await this.prisma.adminMember.findUnique({
      where: { id: adminId },
    });

    if (!member) {
      return null;
    }

    if (normalizeMemberStatus(member.status) !== ADMIN_MEMBER_STATUS_ACTIVE) {
      throw new UnauthorizedException("This admin member has been disabled.");
    }

    return member;
  }

  async touchLastLogin(adminId: string): Promise<void> {
    const member = await this.prisma.adminMember.findUnique({
      where: { id: adminId },
      select: { id: true },
    });

    if (!member) {
      return;
    }

    await this.prisma.adminMember.update({
      where: { id: adminId },
      data: { lastLoginAt: new Date() },
    });
  }

  isMemberTotpEnabled(member: AdminMember | null | undefined): boolean {
    return Boolean(member?.totpEnabled && member?.totpSecret);
  }

  verifyMemberTotp(member: AdminMember | null | undefined, code: string): boolean {
    if (!this.isMemberTotpEnabled(member)) {
      return true;
    }

    return verifyTotpCodeWithSecret(String(member?.totpSecret || ""), code);
  }

  private getAvailableSlots(): number[] {
    return Array.from({ length: getAdminKeysFromEnv().length }, (_, index) => index + 1);
  }

  private getConfiguredRoleForSlot(slot: number): AdminRole {
    const configuredRole = getAppConfig().admin.roleAssignments[slot];
    return normalizeAdminRole(configuredRole, AdminRole.SUPER_ADMIN);
  }

  private mapMember(member: AdminMember): AdminMemberRecord {
    const availableSlots = new Set(this.getAvailableSlots());
    const keySlot = typeof member.keySlot === "number" ? member.keySlot : null;
    const keySlotStatus = !keySlot
      ? "unassigned"
      : availableSlots.has(keySlot)
        ? "assigned"
        : "missing";

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: normalizeAdminRole(member.role, AdminRole.SUPER_ADMIN),
      status: normalizeMemberStatus(member.status),
      keySlot,
      keySlotStatus,
      source: member.source,
      totpEnabled: Boolean(member.totpEnabled && member.totpSecret),
      hasTotpSecret: Boolean(member.totpSecret),
      notes: member.notes,
      lastLoginAt: member.lastLoginAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    };
  }

  private buildMemberSession(member: AdminMember, fallbackRole: AdminRole) {
    return buildAdminSessionProfile(member.id, normalizeAdminRole(member.role, fallbackRole), {
      adminName: member.name,
      adminEmail: member.email,
      memberStatus: normalizeMemberStatus(member.status),
      authMode: member.keySlot ? "env_admin_key" : "admin_member",
      keySlot: member.keySlot,
      totpEnabled: Boolean(member.totpEnabled && member.totpSecret),
    });
  }

  private normalizeEmail(value: unknown): string | null {
    const email = sanitizeOptionalText(value)?.toLowerCase() || null;
    if (!email) {
      return null;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      throw new BadRequestException("Invalid admin email.");
    }

    return email;
  }

  private readKeySlot(value: unknown): number | null {
    if (value === null || value === "") {
      return null;
    }

    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new BadRequestException("keySlot must be a positive integer.");
    }

    const availableSlots = this.getAvailableSlots();
    if (!availableSlots.includes(parsed)) {
      throw new BadRequestException("keySlot must match a configured ADMIN_KEYS slot.");
    }

    return parsed;
  }

  private async assertEmailAvailable(email: string | null | undefined, currentId?: string) {
    if (!email) {
      return;
    }

    const existing = await this.prisma.adminMember.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing && existing.id !== currentId) {
      throw new ConflictException("Admin email already exists.");
    }
  }

  private async assertKeySlotAvailable(keySlot: number | null | undefined, currentId?: string) {
    if (!keySlot) {
      return;
    }

    const existing = await this.prisma.adminMember.findFirst({
      where: { keySlot },
      select: { id: true },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException("This admin key slot is already assigned.");
    }
  }
}
