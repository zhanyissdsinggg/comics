import { SupportController } from "./support.controller";
import { getUserIdFromRequest } from "../../common/utils/auth";

jest.mock("../../common/utils/auth", () => ({
  getUserIdFromRequest: jest.fn(),
}));

describe("SupportController", () => {
  let controller: SupportController;
  let prisma: {
    supportTicket: {
      create: jest.Mock;
    };
  };
  let res: {
    status: jest.Mock;
  };

  const mockedGetUserIdFromRequest = getUserIdFromRequest as jest.MockedFunction<
    typeof getUserIdFromRequest
  >;

  beforeEach(() => {
    prisma = {
      supportTicket: {
        create: jest.fn().mockResolvedValue({ id: "ticket-1" }),
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
    };

    controller = new SupportController(prisma as never);
    mockedGetUserIdFromRequest.mockReset();
  });

  it("creates a guest support ticket when a reply email is provided", async () => {
    mockedGetUserIdFromRequest.mockReturnValue(null);

    const result = await controller.create(
      {
        topic: "billing",
        replyEmail: "guest@example.com",
        orderId: "ord_12345",
        subject: "Billing issue",
        message: "Need a receipt.",
      },
      {} as never,
      res as never,
    );

    expect(prisma.supportTicket.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        replyEmail: "guest@example.com",
        orderId: "ord_12345",
        topic: "billing",
        subject: "Billing issue",
        message: "Need a receipt.",
        status: "open",
      },
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it("rejects guest support requests without a reply email", async () => {
    mockedGetUserIdFromRequest.mockReturnValue(null);

    const result = await controller.create(
      {
        topic: "technical",
        subject: "Reader issue",
        message: "Episode will not load.",
      },
      {} as never,
      res as never,
    );

    expect(prisma.supportTicket.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(result).toEqual(
      expect.objectContaining({
        error: "INVALID_REQUEST",
        message: "Reply email is required for guest support requests.",
      }),
    );
  });

  it("allows signed-in requests without requiring a separate reply email", async () => {
    mockedGetUserIdFromRequest.mockReturnValue("user-1");

    const result = await controller.create(
      {
        topic: "subscription",
        subject: "Membership help",
        message: "Renewal looks wrong.",
      },
      {} as never,
      res as never,
    );

    expect(prisma.supportTicket.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        replyEmail: null,
        orderId: null,
        topic: "subscription",
        subject: "Membership help",
        message: "Renewal looks wrong.",
        status: "open",
      },
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it("retries signed-in support requests without replyEmail when the legacy database is missing that column", async () => {
    mockedGetUserIdFromRequest.mockReturnValue("user-1");
    prisma.supportTicket.create
      .mockRejectedValueOnce({
        code: "P2022",
        meta: { column: "support_tickets.replyEmail" },
        message: "The column `support_tickets.replyEmail` does not exist in the current database.",
      })
      .mockResolvedValueOnce({ id: "ticket-compat-1" });

    const result = await controller.create(
      {
        topic: "account",
        replyEmail: "reader@example.com",
        subject: "Password help",
        message: "Need a reset link.",
      },
      {} as never,
      res as never,
    );

    expect(prisma.supportTicket.create).toHaveBeenNthCalledWith(2, {
      data: {
        userId: "user-1",
        orderId: null,
        topic: "account",
        subject: "Password help",
        message: "Need a reset link.",
        status: "open",
      },
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it("returns a clear 503 for guest support requests when replyEmail storage is unavailable", async () => {
    mockedGetUserIdFromRequest.mockReturnValue(null);
    prisma.supportTicket.create.mockRejectedValueOnce({
      code: "P2022",
      meta: { column: "support_tickets.replyEmail" },
      message: "The column `support_tickets.replyEmail` does not exist in the current database.",
    });

    const result = await controller.create(
      {
        topic: "billing",
        replyEmail: "guest@example.com",
        subject: "Receipt missing",
        message: "Please resend the invoice.",
      },
      {} as never,
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(result).toEqual(
      expect.objectContaining({
        error: "INTERNAL",
        message: "Guest support requests are temporarily unavailable until the support email field is migrated.",
      }),
    );
  });
});
