import { ServiceUnavailableException } from "@nestjs/common";
import { resetAppConfigForTests } from "../../../../common/config/app-config";
import { AdminRole } from "../../permissions/admin-permissions";
import { AdminMembersService } from "./admin-members.service";

describe("AdminMembersService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/gush_test",
      FRONTEND_ORIGIN: "http://localhost:3000",
      JWT_SECRET: "test-jwt-secret-keep-it-long-enough-for-validation",
      ADMIN_KEY: "TestAdminKey123!Secure",
      ADMIN_ROLE_ASSIGNMENTS: "1:super_admin",
    };
    resetAppConfigForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetAppConfigForTests();
  });

  it("falls back to env-only login mode when admin_members is missing", async () => {
    const prisma = {
      adminMember: {
        findMany: jest.fn().mockRejectedValue({
          code: "P2021",
          meta: { table: "public.admin_members" },
          message: "The table `public.admin_members` does not exist in the current database.",
        }),
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const service = new AdminMembersService(prisma as any);
    const result = await service.resolveLoginMember("TestAdminKey123!Secure");

    expect(result.member).toBeNull();
    expect(result.adminRole).toBe(AdminRole.SUPER_ADMIN);
    expect(result.session?.authMode).toBe("env_admin_key_compat");
    expect(prisma.adminMember.create).not.toHaveBeenCalled();
    expect(prisma.adminMember.findFirst).not.toHaveBeenCalled();
  });

  it("returns env-backed members when admin_members is missing", async () => {
    const prisma = {
      adminMember: {
        findMany: jest.fn().mockRejectedValue({
          code: "P2021",
          meta: { table: "public.admin_members" },
          message: "The table `public.admin_members` does not exist in the current database.",
        }),
        create: jest.fn(),
      },
    };

    const service = new AdminMembersService(prisma as any);
    const result = await service.listMembers({});

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        keySlot: 1,
        source: "env_compat",
        name: "Admin key slot 1",
      }),
    );
    expect(result.meta.keySlots).toEqual([
      expect.objectContaining({
        slot: 1,
        assignedMemberName: "Admin key slot 1",
      }),
    ]);
  });

  it("blocks admin member writes until the migration is applied", async () => {
    const prisma = {
      adminMember: {
        findMany: jest.fn().mockRejectedValue({
          code: "P2021",
          meta: { table: "public.admin_members" },
          message: "The table `public.admin_members` does not exist in the current database.",
        }),
        create: jest.fn(),
      },
    };

    const service = new AdminMembersService(prisma as any);
    await service.syncMembersFromEnv();

    await expect(
      service.createMember({
        name: "Ops Admin",
        role: "ops_admin",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
