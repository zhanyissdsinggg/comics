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
        replyEmail: null,
        orderId: "ord_123",
        topic: "billing",
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
        select: expect.objectContaining({
          user: { select: { email: true } },
          replyEmail: true,
        }),
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

  it("falls back to reply email for guest tickets", async () => {
    prisma.supportTicket.findMany.mockResolvedValue([
      {
        id: "ticket-guest-1",
        userId: null,
        replyEmail: "guest@example.com",
        orderId: "ord_guest_1",
        topic: "technical",
        subject: "Reader issue",
        message: "Chapter will not open",
        status: "open",
        createdAt: new Date("2026-03-12T08:00:00.000Z"),
        updatedAt: new Date("2026-03-12T08:00:00.000Z"),
        user: null,
      },
    ]);
    prisma.supportTicket.count.mockResolvedValue(1);

    const result = await controller.list({
      query: {
        search: "guest@example.com",
      },
    } as never);

    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            {
              replyEmail: { contains: "guest@example.com", mode: "insensitive" },
            },
          ]),
        },
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            id: "ticket-guest-1",
            userEmail: "guest@example.com",
            replyEmail: "guest@example.com",
            orderId: "ord_guest_1",
            topic: "technical",
          }),
        ],
      }),
    );
  });

  it("falls back cleanly when the replyEmail column is unavailable", async () => {
    prisma.supportTicket.findMany
      .mockRejectedValueOnce({
        code: "P2022",
        meta: { column: "support_tickets.replyEmail" },
        message: "The column `support_tickets.replyEmail` does not exist in the current database.",
      })
      .mockResolvedValueOnce([
        {
          id: "ticket-compat-1",
          userId: "user-1",
          orderId: null,
          topic: "billing",
          subject: "Need help",
          message: "Invoice missing",
          status: "open",
          createdAt: new Date("2026-03-10T08:00:00.000Z"),
          updatedAt: new Date("2026-03-11T08:00:00.000Z"),
          user: { email: "reader@example.com" },
        },
      ]);
    prisma.supportTicket.count
      .mockRejectedValueOnce({
        code: "P2022",
        meta: { column: "support_tickets.replyEmail" },
        message: "The column `support_tickets.replyEmail` does not exist in the current database.",
      })
      .mockResolvedValueOnce(1);

    const result = await controller.list({
      query: {
        search: "reader@example.com",
      },
    } as never);

    expect(prisma.supportTicket.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        select: expect.not.objectContaining({
          replyEmail: true,
        }),
        where: {
          OR: expect.not.arrayContaining([
            {
              replyEmail: { contains: "reader@example.com", mode: "insensitive" },
            },
          ]),
        },
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            id: "ticket-compat-1",
            replyEmail: null,
            userEmail: "reader@example.com",
          }),
        ],
      }),
    );
  });

  it("falls back cleanly when orderId is unavailable in the database", async () => {
    prisma.supportTicket.findMany
      .mockRejectedValueOnce({
        code: "P2022",
        meta: { column: "support_tickets.orderId" },
        message: "The column `support_tickets.orderId` does not exist in the current database.",
      })
      .mockResolvedValueOnce([
        {
          id: "ticket-compat-2",
          userId: "user-2",
          topic: "billing",
          subject: "Missing invoice",
          message: "Please resend it.",
          status: "open",
          createdAt: new Date("2026-03-12T08:00:00.000Z"),
          updatedAt: new Date("2026-03-12T08:00:00.000Z"),
          user: { email: "reader2@example.com" },
          replyEmail: "reader2@example.com",
        },
      ]);
    prisma.supportTicket.count
      .mockRejectedValueOnce({
        code: "P2022",
        meta: { column: "support_tickets.orderId" },
        message: "The column `support_tickets.orderId` does not exist in the current database.",
      })
      .mockResolvedValueOnce(1);

    const result = await controller.list({
      query: {
        search: "reader2@example.com",
      },
    } as never);

    expect(prisma.supportTicket.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        select: expect.not.objectContaining({
          orderId: true,
        }),
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            id: "ticket-compat-2",
            orderId: null,
            replyEmail: "reader2@example.com",
          }),
        ],
      }),
    );
  });
});

