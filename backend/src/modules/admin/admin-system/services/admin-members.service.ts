import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { AdminMember, Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { getAppConfig } from "../../../../common/config/app-config";
import { logger } from "../../../../common/logger/winston.init";
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
const ADMIN_MEMBER_ENV_SYNC_TTL_MS = 5 * 60 * 1000;
const ADMIN_PASSWORD_MIN_LENGTH = 8;

type AdminMembersStorageMode = "unknown" | "database" | "env_compat";

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

function normalizeLegacySlotMemberName(name: unknown, keySlot: number | null | undefined): string {
  const normalizedName = sanitizeText(name);
  if (!normalizedName) {
    return keySlot ? `后台密钥槽位 ${keySlot}` : "";
  }

  const legacyMatch = normalizedName.match(/^Admin key slot\s+(\d+)$/i);
  if (legacyMatch) {
    return `后台密钥槽位 ${legacyMatch[1]}`;
  }

  return normalizedName;
}

@Injectable()
export class AdminMembersService {
  private storageMode: AdminMembersStorageMode = "unknown";
  private lastEnvSyncAt = 0;
  private envSyncPromise: Promise<{ created: number; totalSlots: number }> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async syncMembersFromEnv(): Promise<{ created: number; totalSlots: number }> {
    const availableSlots = this.getAvailableSlots();
    if (availableSlots.length === 0) {
      return { created: 0, totalSlots: 0 };
    }

    const now = Date.now();
    if (
      this.storageMode === "database"
      && this.lastEnvSyncAt > 0
      && now - this.lastEnvSyncAt < ADMIN_MEMBER_ENV_SYNC_TTL_MS
    ) {
      return { created: 0, totalSlots: availableSlots.length };
    }

    if (this.envSyncPromise) {
      return this.envSyncPromise;
    }

    this.envSyncPromise = (async () => {
      const existingMembers = await this.runWithMemberStoreFallback(
        () => this.prisma.adminMember.findMany({
          where: {
            keySlot: { in: availableSlots },
          },
          select: {
            id: true,
            keySlot: true,
          },
        }),
        () => [],
      );
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

        const createdMember = await this.runWithMemberStoreFallback(
          () => this.prisma.adminMember.create({
            data: {
              name: `后台密钥槽位 ${slot}`,
              role: this.getConfiguredRoleForSlot(slot),
              status: ADMIN_MEMBER_STATUS_ACTIVE,
              keySlot: slot,
              source: "env_seed",
            },
          }),
          () => null,
        );

        if (!createdMember) {
          this.lastEnvSyncAt = Date.now();
          return {
            created,
            totalSlots: availableSlots.length,
          };
        }

        created += 1;
      }

      this.lastEnvSyncAt = Date.now();
      return {
        created,
        totalSlots: availableSlots.length,
      };
    })();

    try {
      return await this.envSyncPromise;
    } finally {
      this.envSyncPromise = null;
    }
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

    const membersResult = await this.runWithMemberStoreFallback(
      async () => {
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
          items: members.map((member) => this.mapMember(member)),
          total,
          meta,
        };
      },
      async () => {
        const envMembers = this.filterEnvCompatMembers(query);
        return {
          items: envMembers.items,
          total: envMembers.total,
          meta: await this.getMeta(),
        };
      },
    );

    return {
      ...buildPaginationResult(membersResult.items, membersResult.total, page, pageSize),
      meta: membersResult.meta,
    };
  }

  async getMeta(): Promise<AdminMemberMeta> {
    await this.syncMembersFromEnv();

    const members = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.findMany({
        where: {
          keySlot: { not: null },
        },
        select: {
          id: true,
          name: true,
          keySlot: true,
        },
      }),
      () => this.buildEnvCompatMembers().map((member) => ({
        id: member.id,
        name: member.name,
        keySlot: member.keySlot,
      })),
    );

    const memberBySlot = new Map<number, { id: string; name: string }>();
    for (const member of members) {
      if (typeof member.keySlot === "number") {
        memberBySlot.set(member.keySlot, {
          id: member.id,
          name: normalizeLegacySlotMemberName(member.name, member.keySlot),
        });
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
    this.assertMemberStoreWritable();

    const name = sanitizeText(input.name);
    if (!name) {
      throw new BadRequestException("成员名称不能为空。");
    }

    const email = this.normalizeEmail(input.email);
    const passwordHash = await this.hashPassword(input.password);
    const keySlot = input.keySlot === undefined ? null : this.readKeySlot(input.keySlot);
    await this.assertEmailAvailable(email);
    await this.assertKeySlotAvailable(keySlot);

    const totpEnabled = readBooleanFlag(input.totpEnabled, false);
    const member = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.create({
        data: {
          name,
          email,
          passwordHash,
          role: normalizeAdminRole(input.role, AdminRole.SUPER_ADMIN),
          status: normalizeMemberStatus(input.status),
          keySlot,
          source: sanitizeOptionalText(input.source) || "manual",
          notes: sanitizeOptionalText(input.notes),
          totpEnabled,
          totpSecret: totpEnabled ? generateTotpSecret() : null,
        },
      }),
      () => {
        throw this.buildMemberStoreUnavailableError();
      },
    );

    return this.mapMember(member);
  }

  async updateMember(id: string, input: Record<string, unknown>) {
    this.assertMemberStoreWritable();

    const existing = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.findUnique({ where: { id } }),
      () => null,
    );
    if (!existing) {
      throw new NotFoundException("未找到对应的后台成员。");
    }

    const nextEmail = input.email !== undefined ? this.normalizeEmail(input.email) : undefined;
    const nextKeySlot = input.keySlot !== undefined ? this.readKeySlot(input.keySlot) : undefined;
    const nextPasswordHash = await this.hashPassword(input.password, true);
    await this.assertEmailAvailable(nextEmail, id);
    await this.assertKeySlotAvailable(nextKeySlot, id);

    const nextTotpEnabled = input.totpEnabled !== undefined
      ? readBooleanFlag(input.totpEnabled, existing.totpEnabled)
      : existing.totpEnabled;

    if (nextTotpEnabled && !existing.totpSecret && input.totpEnabled !== undefined) {
      throw new BadRequestException("请先生成 2FA 密钥，再启用成员专属验证。");
    }

    const member = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.update({
        where: { id },
        data: {
          name: input.name !== undefined ? sanitizeText(input.name) || existing.name : undefined,
          email: nextEmail,
          passwordHash: nextPasswordHash === undefined ? undefined : nextPasswordHash,
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
      }),
      () => {
        throw this.buildMemberStoreUnavailableError();
      },
    );

    return this.mapMember(member);
  }

  async resolveLoginMemberByEmail(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      return null;
    }

    const member = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.findUnique({ where: { email: normalizedEmail } }),
      () => null,
    );

    if (!member) {
      return null;
    }

    if (normalizeMemberStatus(member.status) !== ADMIN_MEMBER_STATUS_ACTIVE) {
      throw new UnauthorizedException("杩欎釜鍚庡彴鎴愬憳宸茶鍋滅敤銆?");
    }

    if (!member.passwordHash) {
      return null;
    }

    const isValid = await bcrypt.compare(password, member.passwordHash);
    if (!isValid) {
      return null;
    }

    const adminRole = normalizeAdminRole(member.role, AdminRole.SUPER_ADMIN);
    return {
      member,
      adminId: member.id,
      adminRole,
      session: this.buildMemberSession(member, AdminRole.SUPER_ADMIN),
    };
  }

  async setMemberStatus(id: string, status: string) {
    this.assertMemberStoreWritable();

    const existing = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.findUnique({ where: { id } }),
      () => null,
    );
    if (!existing) {
      throw new NotFoundException("未找到对应的后台成员。");
    }

    const member = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.update({
        where: { id },
        data: {
          status: normalizeMemberStatus(status),
        },
      }),
      () => {
        throw this.buildMemberStoreUnavailableError();
      },
    );

    return this.mapMember(member);
  }

  async regenerateMemberTotp(id: string) {
    this.assertMemberStoreWritable();

    const existing = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.findUnique({ where: { id } }),
      () => null,
    );
    if (!existing) {
      throw new NotFoundException("未找到对应的后台成员。");
    }

    const secret = generateTotpSecret();
    const issuer = "Tappytoon Admin";
    const label = existing.email || existing.name || existing.id;
    const member = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.update({
        where: { id },
        data: {
          totpSecret: secret,
          totpEnabled: true,
        },
      }),
      () => {
        throw this.buildMemberStoreUnavailableError();
      },
    );

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
    this.assertMemberStoreWritable();

    const existing = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.findUnique({ where: { id } }),
      () => null,
    );
    if (!existing) {
      throw new NotFoundException("未找到对应的后台成员。");
    }

    const member = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.update({
        where: { id },
        data: {
          totpSecret: null,
          totpEnabled: false,
        },
      }),
      () => {
        throw this.buildMemberStoreUnavailableError();
      },
    );

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
    const member = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.findFirst({
        where: { keySlot },
      }),
      () => null,
    );

    if (member && normalizeMemberStatus(member.status) !== ADMIN_MEMBER_STATUS_ACTIVE) {
      throw new UnauthorizedException("这个后台成员已被停用。");
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
        authMode: this.storageMode === "env_compat" ? "env_admin_key_compat" : "legacy_env_admin_key",
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
          authMode: this.storageMode === "env_compat" ? "env_admin_key_compat" : "legacy_env_admin_key",
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
    const member = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.findUnique({
        where: { id: adminId },
      }),
      () => null,
    );

    if (!member) {
      return null;
    }

    if (normalizeMemberStatus(member.status) !== ADMIN_MEMBER_STATUS_ACTIVE) {
      throw new UnauthorizedException("这个后台成员已被停用。");
    }

    return member;
  }

  async touchLastLogin(adminId: string): Promise<void> {
    await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.updateMany({
        where: { id: adminId },
        data: { lastLoginAt: new Date() },
      }),
      () => ({ count: 0 }),
    );
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

  private async runWithMemberStoreFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T> | T,
  ): Promise<T> {
    if (this.storageMode === "env_compat") {
      return await fallback();
    }

    try {
      const result = await operation();
      this.storageMode = "database";
      return result;
    } catch (error) {
      if (this.isAdminMembersTableUnavailable(error)) {
        this.markEnvCompatMode(error);
        return await fallback();
      }
      throw error;
    }
  }

  private isAdminMembersTableUnavailable(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const candidate = error as {
      code?: unknown;
      message?: unknown;
      meta?: Record<string, unknown>;
    };
    const code = String(candidate.code || "").trim();
    const tableName = String(candidate.meta?.table || candidate.meta?.modelName || "").trim().toLowerCase();
    const message = String(candidate.message || "").toLowerCase();
    const tableReferenced = tableName.includes("admin_members") || message.includes("admin_members");

    if (!tableReferenced) {
      return false;
    }

    return code === "P2021" || code === "P2022" || message.includes("does not exist");
  }

  private markEnvCompatMode(error: unknown): void {
    if (this.storageMode === "env_compat") {
      return;
    }

    this.storageMode = "env_compat";
    const message = error instanceof Error ? error.message : String(error || "unknown error");
    logger.warn("[admin-members] admin_members table is unavailable; falling back to env-only admin member mode", {
      message,
    });
  }

  private assertMemberStoreWritable(): void {
    if (this.storageMode === "env_compat") {
      throw this.buildMemberStoreUnavailableError();
    }
  }

  private buildMemberStoreUnavailableError(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      "后台成员存储暂不可用，请先应用 admin_members 迁移。",
    );
  }

  private getConfiguredRoleForSlot(slot: number): AdminRole {
    const configuredRole = getAppConfig().admin.roleAssignments[slot];
    return normalizeAdminRole(configuredRole, AdminRole.SUPER_ADMIN);
  }

  private buildEnvCompatMembers(): AdminMemberRecord[] {
    const adminKeys = getAdminKeysFromEnv();
    const baseDate = new Date(0);

    return adminKeys.map((adminKey, index) => {
      const slot = index + 1;
      const adminId = getAdminIdentityFromKey(adminKey) || `env-admin-${slot}`;

      return {
        id: adminId,
        name: `后台密钥槽位 ${slot}`,
        email: null,
        role: this.getConfiguredRoleForSlot(slot),
        status: ADMIN_MEMBER_STATUS_ACTIVE,
        keySlot: slot,
        keySlotStatus: "assigned",
        source: "env_compat",
        totpEnabled: false,
        hasTotpSecret: false,
        notes: "请先应用 admin_members 迁移，然后再在数据库里管理后台成员。",
        lastLoginAt: null,
        createdAt: baseDate,
        updatedAt: baseDate,
      };
    });
  }

  private filterEnvCompatMembers(query: Record<string, unknown>): {
    items: AdminMemberRecord[];
    total: number;
  } {
    const { page, pageSize } = parsePaginationParams(query);
    const offset = calculateOffset(page, pageSize);
    const search = sanitizeText(query.search).toLowerCase();
    const status = sanitizeOptionalText(query.status);
    const role = sanitizeOptionalText(query.role);
    const sortBy = ADMIN_MEMBER_SORT_FIELDS.has(sanitizeText(query.sortBy))
      ? sanitizeText(query.sortBy)
      : "createdAt";
    const sortOrder = normalizeSortOrder(query.sortOrder);

    const filtered = this.buildEnvCompatMembers().filter((member) => {
      if (search) {
        const haystack = [
          member.id,
          member.name,
          member.email || "",
          member.role,
          member.notes || "",
        ].join(" ").toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }

      if (status && normalizeMemberStatus(status, status) !== member.status) {
        return false;
      }

      if (role && normalizeAdminRole(role, member.role) !== member.role) {
        return false;
      }

      return true;
    });

    filtered.sort((left, right) => {
      const leftValue = left[sortBy as keyof AdminMemberRecord];
      const rightValue = right[sortBy as keyof AdminMemberRecord];

      if (leftValue instanceof Date || rightValue instanceof Date) {
        const leftTime = leftValue instanceof Date ? leftValue.getTime() : 0;
        const rightTime = rightValue instanceof Date ? rightValue.getTime() : 0;
        return sortOrder === "asc" ? leftTime - rightTime : rightTime - leftTime;
      }

      if (typeof leftValue === "number" || typeof rightValue === "number") {
        const leftNumber = typeof leftValue === "number" ? leftValue : Number(leftValue || 0);
        const rightNumber = typeof rightValue === "number" ? rightValue : Number(rightValue || 0);
        return sortOrder === "asc" ? leftNumber - rightNumber : rightNumber - leftNumber;
      }

      const comparison = String(leftValue || "").localeCompare(String(rightValue || ""));
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return {
      items: filtered.slice(offset, offset + pageSize),
      total: filtered.length,
    };
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
      name: normalizeLegacySlotMemberName(member.name, keySlot),
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
      adminName: normalizeLegacySlotMemberName(member.name, member.keySlot),
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
      throw new BadRequestException("后台邮箱格式无效。");
    }

    return email;
  }

  private async hashPassword(
    value: unknown,
    allowEmpty = false,
  ): Promise<string | null | undefined> {
    if (value === undefined) {
      return undefined;
    }

    const password = String(value || "");
    if (!password) {
      if (allowEmpty) {
        return null;
      }
      throw new BadRequestException("鍚庡彴鐧诲綍瀵嗙爜涓嶈兘涓虹┖銆?");
    }

    if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
      throw new BadRequestException(
        `鍚庡彴鐧诲綍瀵嗙爜鑷冲皯 ${ADMIN_PASSWORD_MIN_LENGTH} 浣嶃€?`,
      );
    }

    return await bcrypt.hash(password, 10);
  }

  private readKeySlot(value: unknown): number | null {
    if (value === null || value === "") {
      return null;
    }

    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new BadRequestException("密钥槽位必须是大于 0 的整数。");
    }

    const availableSlots = this.getAvailableSlots();
    if (!availableSlots.includes(parsed)) {
      throw new BadRequestException("密钥槽位必须对应已配置的 ADMIN_KEYS 槽位。");
    }

    return parsed;
  }

  private async assertEmailAvailable(email: string | null | undefined, currentId?: string) {
    if (!email) {
      return;
    }

    const existing = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.findUnique({
        where: { email },
        select: { id: true },
      }),
      () => {
        throw this.buildMemberStoreUnavailableError();
      },
    );

    if (existing && existing.id !== currentId) {
      throw new ConflictException("后台邮箱已存在。");
    }
  }

  private async assertKeySlotAvailable(keySlot: number | null | undefined, currentId?: string) {
    if (!keySlot) {
      return;
    }

    const existing = await this.runWithMemberStoreFallback(
      () => this.prisma.adminMember.findFirst({
        where: { keySlot },
        select: { id: true },
      }),
      () => {
        throw this.buildMemberStoreUnavailableError();
      },
    );

    if (existing && existing.id !== currentId) {
      throw new ConflictException("这个后台密钥槽位已经分配给其他成员。");
    }
  }
}
