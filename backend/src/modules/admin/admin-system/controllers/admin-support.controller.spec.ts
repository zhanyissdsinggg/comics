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
        adminReply: null,
        adminRepliedAt: null,
        status: "open",
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        updatedAt: new Date("2026-03-11T08:00:00.000Z"),
        user: { email: "reader@supportmail.com" },
      },
    ]);
    prisma.supportTicket.count.mockResolvedValue(1);

    const result = await controller.list({
      query: {
        page: "2",
        pageSize: "10",
        search: "reader@supportmail.com",
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
          orderId: true,
          topic: true,
          adminReply: true,
          adminRepliedAt: true,
        }),
        orderBy: { updatedAt: "asc" },
        skip: 10,
        take: 10,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              status: "open",
              OR: expect.arrayContaining([
                {
                  user: {
                    is: {
                      email: { contains: "reader@supportmail.com", mode: "insensitive" },
                    },
                  },
                },
                {
                  replyEmail: { contains: "reader@supportmail.com", mode: "insensitive" },
                },
              ]),
            }),
          ]),
        }),
      }),
    );

    expect(prisma.supportTicket.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            status: "open",
            OR: expect.arrayContaining([
              {
                user: {
                  is: {
                    email: { contains: "reader@supportmail.com", mode: "insensitive" },
                  },
                },
              },
            ]),
          }),
        ]),
      }),
    });

    expect(result).toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            id: "ticket-1",
            userEmail: "reader@supportmail.com",
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
        adminReply: "Please clear the cache and try again.",
        adminRepliedAt: new Date("2026-03-12T10:00:00.000Z"),
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
        includeTestData: "1",
      },
    } as never);

    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              replyEmail: { contains: "guest@example.com", mode: "insensitive" },
            },
          ]),
        }),
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
            adminReply: "Please clear the cache and try again.",
          }),
        ],
      }),
    );
  });

  it("persists the admin reply body and reply timestamp", async () => {
    prisma.supportTicket.findUnique.mockResolvedValue({
      id: "ticket-2",
      status: "open",
    });
    prisma.supportTicket.update.mockResolvedValue({
      id: "ticket-2",
      status: "in_progress",
      adminReply: "We have refreshed the chapter files for you.",
      adminRepliedAt: new Date("2026-04-02T12:00:00.000Z"),
    });

    const result = await controller.reply("ticket-2", {
      message: "We have refreshed the chapter files for you.",
    });

    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: "ticket-2" },
      data: expect.objectContaining({
        status: "in_progress",
        adminReply: "We have refreshed the chapter files for you.",
        adminRepliedAt: expect.any(Date),
      }),
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        ticket: expect.objectContaining({
          id: "ticket-2",
          status: "in_progress",
          adminReply: "We have refreshed the chapter files for you.",
        }),
        reply: expect.objectContaining({
          message: "We have refreshed the chapter files for you.",
          repliedAt: expect.any(String),
        }),
      }),
    );
  });

  it("falls back to compat list mode when reply columns are missing from support_tickets", async () => {
    prisma.supportTicket.findMany
      .mockRejectedValueOnce({
        code: "P2022",
        message: 'The column support_tickets.adminReply does not exist in the current database.',
      })
      .mockResolvedValueOnce([
        {
          id: "ticket-compat-1",
          userId: null,
          replyEmail: "reader@example.com",
          orderId: null,
          topic: "account",
          subject: "Account help",
          message: "Please check my login",
          status: "open",
          createdAt: new Date("2026-04-10T08:00:00.000Z"),
          updatedAt: new Date("2026-04-10T08:30:00.000Z"),
          user: null,
        },
      ]);
    prisma.supportTicket.count.mockResolvedValue(1);

    const result = await controller.list({
      query: {
        search: "reader@example.com",
      },
    } as never);

    expect(prisma.supportTicket.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        select: expect.objectContaining({
          adminReply: true,
          adminRepliedAt: true,
        }),
      }),
    );
    const compatListCall = prisma.supportTicket.findMany.mock.calls[1][0];
    expect(compatListCall.select.adminReply).toBeUndefined();
    expect(compatListCall.select.adminRepliedAt).toBeUndefined();
    expect(JSON.stringify(compatListCall.where)).not.toContain("adminReply");

    expect(result).toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            id: "ticket-compat-1",
            adminReply: null,
            adminRepliedAt: null,
          }),
        ],
        meta: {
          capabilities: {
            replyPersistence: false,
          },
        },
      }),
    );
  });

  it("returns 503 when reply persistence is unavailable in compat mode", async () => {
    prisma.supportTicket.findMany
      .mockRejectedValueOnce({
        code: "P2022",
        message: 'The column support_tickets.adminReply does not exist in the current database.',
      })
      .mockResolvedValueOnce([]);
    prisma.supportTicket.count.mockResolvedValue(0);

    await controller.list({
      query: {},
    } as never);

    prisma.supportTicket.findUnique.mockResolvedValue({
      id: "ticket-compat-2",
      status: "open",
    });

    await expect(
      controller.reply("ticket-compat-2", {
        message: "We are checking this for you.",
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message:
          "当前数据库还没有应用客服回复字段迁移，客服队列暂时只支持查看和关单。请先执行 support_tickets 回复字段迁移。",
        code: "SUPPORT_REPLY_PERSISTENCE_UNAVAILABLE",
        capabilities: {
          replyPersistence: false,
        },
      }),
      status: 503,
    });

    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
  });

  it("re-probes support reply persistence after the compat cooldown and restores full mode", async () => {
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValue(0);

    prisma.supportTicket.findMany
      .mockRejectedValueOnce({
        code: "P2022",
        message: 'The column support_tickets.adminReply does not exist in the current database.',
      })
      .mockResolvedValueOnce([
        {
          id: "ticket-compat-3",
          userId: null,
          replyEmail: "reader@example.com",
          orderId: null,
          topic: null,
          subject: "Compat mode",
          message: "fallback row",
          status: "open",
          createdAt: new Date("2026-04-10T08:00:00.000Z"),
          updatedAt: new Date("2026-04-10T08:30:00.000Z"),
          user: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "ticket-full-1",
          userId: null,
          replyEmail: "reader@example.com",
          orderId: null,
          topic: null,
          subject: "Full mode",
          message: "reply fields are back",
          adminReply: "Stored reply",
          adminRepliedAt: new Date("2026-04-10T09:00:00.000Z"),
          status: "in_progress",
          createdAt: new Date("2026-04-10T08:00:00.000Z"),
          updatedAt: new Date("2026-04-10T09:00:00.000Z"),
          user: null,
        },
      ]);
    prisma.supportTicket.count.mockResolvedValue(1);

    await controller.list({
      query: {},
    } as never);

    nowSpy.mockReturnValue(31_000);
    const result = await controller.list({
      query: {},
    } as never);

    expect(result).toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            id: "ticket-full-1",
            adminReply: "Stored reply",
          }),
        ],
        meta: {
          capabilities: {
            replyPersistence: true,
          },
        },
      }),
    );
    expect(prisma.supportTicket.findMany).toHaveBeenCalledTimes(3);

    nowSpy.mockRestore();
  });
});
