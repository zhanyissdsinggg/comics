import { AdminSupportController } from "./admin-support.controller";

describe("AdminSupportController", () => {
  let controller: AdminSupportController;
  let prisma: {
    supportTicket: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      supportTicket: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    controller = new AdminSupportController(prisma as never);
  });

  it("searches by user email and honors explicit sort options", async () => {
    prisma.supportTicket.findMany.mockResolvedValue([
      {
        id: "ticket-1",
        userId: "user-1",
        subject: "Checkout help",
        message: "Need refund",
        status: "open",
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        updatedAt: new Date("2026-03-11T08:00:00.000Z"),
        user: { email: "reader@example.com" },
      },
    ]);
    prisma.supportTicket.count.mockResolvedValue(1);

    const result = await controller.list({
      query: {
        page: "2",
        pageSize: "10",
        search: "reader@example.com",
        status: "open",
        sortBy: "updatedAt",
        sortOrder: "asc",
      },
    } as never);

    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { user: { select: { email: true } } },
        orderBy: { updatedAt: "asc" },
        skip: 10,
        take: 10,
        where: {
          status: "open",
          OR: expect.arrayContaining([
            {
              user: {
                is: {
                  email: { contains: "reader@example.com", mode: "insensitive" },
                },
              },
            },
          ]),
        },
      }),
    );

    expect(prisma.supportTicket.count).toHaveBeenCalledWith({
      where: {
        status: "open",
        OR: expect.arrayContaining([
          {
            user: {
              is: {
                email: { contains: "reader@example.com", mode: "insensitive" },
              },
            },
          },
        ]),
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            id: "ticket-1",
            userEmail: "reader@example.com",
          }),
        ],
        pagination: expect.objectContaining({
          page: 2,
          pageSize: 10,
          total: 1,
        }),
      }),
    );
  });

  it("falls back to createdAt desc when the sort field is invalid", async () => {
    prisma.supportTicket.findMany.mockResolvedValue([]);
    prisma.supportTicket.count.mockResolvedValue(0);

    await controller.list({
      query: {
        sortBy: "nonsense",
        sortOrder: "sideways",
      },
    } as never);

    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("allows sorting by status", async () => {
    prisma.supportTicket.findMany.mockResolvedValue([]);
    prisma.supportTicket.count.mockResolvedValue(0);

    await controller.list({
      query: {
        sortBy: "status",
        sortOrder: "asc",
      },
    } as never);

    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { status: "asc" },
      }),
    );
  });
});

