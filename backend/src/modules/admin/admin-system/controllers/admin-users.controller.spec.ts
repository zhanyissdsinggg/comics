import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminUsersController } from "./admin-users.controller";

describe("AdminUsersController", () => {
  let controller: AdminUsersController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            supportTicket: {
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
            },
          },
        },
        {
          provide: AdminLogService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();
    controller = module.get<AdminUsersController>(AdminUsersController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("applies search, sorting, pagination, and a lean select for user list", async () => {
    await controller.list({
      query: {
        page: "2",
        pageSize: "10",
        search: "reader@example.com",
        sortBy: "email",
        sortOrder: "asc",
      },
    } as never);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: { contains: "reader@example.com", mode: "insensitive" } },
          { email: { contains: "reader@example.com", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        email: true,
        isBlocked: true,
        createdAt: true,
        wallet: {
          select: {
            paidPts: true,
            bonusPts: true,
          },
        },
      },
      orderBy: { email: "asc" },
      take: 10,
      skip: 10,
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: { contains: "reader@example.com", mode: "insensitive" } },
          { email: { contains: "reader@example.com", mode: "insensitive" } },
        ],
      },
    });
  });
});
