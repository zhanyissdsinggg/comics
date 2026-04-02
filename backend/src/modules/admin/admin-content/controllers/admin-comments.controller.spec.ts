import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AdminCommentsController } from "./admin-comments.controller";

describe("AdminCommentsController", () => {
  let controller: AdminCommentsController;
  let prisma: {
    comment: {
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    rating: {
      aggregate: jest.Mock;
    };
    series: {
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      comment: {
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      rating: {
        aggregate: jest.fn(),
      },
      series: {
        update: jest.fn(),
      },
    };

    controller = new AdminCommentsController(prisma as never);
  });

  it("lists comments with an explicit select and pagination so schema drift on unused columns does not break the page", async () => {
    prisma.comment.findMany.mockResolvedValue([
      {
        id: "comment-1",
        seriesId: "series-1",
        userId: "user-1",
        text: null,
        content: "Reader feedback",
        hidden: false,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        user: { email: "reader@example.com" },
      },
    ]);
    prisma.comment.count.mockResolvedValue(1);

    const result = await controller.list();

    expect(prisma.comment.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        seriesId: true,
        userId: true,
        text: true,
        content: true,
        hidden: true,
        createdAt: true,
        user: { select: { email: true } },
      },
      skip: 0,
      take: 20,
    });
    expect(prisma.comment.count).toHaveBeenCalledWith({ where: {} });
    expect(result).toEqual({
      comments: [
        {
          id: "comment-1",
          seriesId: "series-1",
          userId: "user-1",
          userEmail: "reader@example.com",
          author: "reader@example.com",
          content: "Reader feedback",
          text: "Reader feedback",
          rating: null,
          hidden: false,
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
        },
      ],
      data: [
        {
          id: "comment-1",
          seriesId: "series-1",
          userId: "user-1",
          userEmail: "reader@example.com",
          author: "reader@example.com",
          content: "Reader feedback",
          text: "Reader feedback",
          rating: null,
          hidden: false,
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  });

  it("supports search, pagination, and safe fallback sorting for unsupported sort fields", async () => {
    prisma.comment.findMany.mockResolvedValue([]);
    prisma.comment.count.mockResolvedValue(0);

    await controller.list("2", "10", "reader@example.com", "rating", "asc");

    expect(prisma.comment.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: { contains: "reader@example.com", mode: "insensitive" } },
          { userId: { contains: "reader@example.com", mode: "insensitive" } },
          { seriesId: { contains: "reader@example.com", mode: "insensitive" } },
          { text: { contains: "reader@example.com", mode: "insensitive" } },
          { content: { contains: "reader@example.com", mode: "insensitive" } },
          {
            user: {
              is: {
                email: { contains: "reader@example.com", mode: "insensitive" },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        seriesId: true,
        userId: true,
        text: true,
        content: true,
        hidden: true,
        createdAt: true,
        user: { select: { email: true } },
      },
      skip: 10,
      take: 10,
    });
    expect(prisma.comment.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: { contains: "reader@example.com", mode: "insensitive" } },
          { userId: { contains: "reader@example.com", mode: "insensitive" } },
          { seriesId: { contains: "reader@example.com", mode: "insensitive" } },
          { text: { contains: "reader@example.com", mode: "insensitive" } },
          { content: { contains: "reader@example.com", mode: "insensitive" } },
          {
            user: {
              is: {
                email: { contains: "reader@example.com", mode: "insensitive" },
              },
            },
          },
        ],
      },
    });
  });

  it("updates visibility without returning the full Prisma comment shape", async () => {
    prisma.comment.update.mockResolvedValue({
      id: "comment-1",
      seriesId: "series-1",
      userId: "user-1",
      text: "Trim this",
      content: "Trim this",
      hidden: true,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      user: null,
    });

    const result = await controller.hide({
      seriesId: "series-1",
      commentId: "comment-1",
      hidden: true,
    });

    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      data: { hidden: true },
      select: {
        id: true,
        seriesId: true,
        userId: true,
        text: true,
        content: true,
        hidden: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });
    expect(result).toEqual({
      comment: {
        id: "comment-1",
        seriesId: "series-1",
        userId: "user-1",
        userEmail: null,
        author: "Guest",
        content: "Trim this",
        text: "Trim this",
        rating: null,
        hidden: true,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
      },
    });
  });

  it("throws when hide is missing identifiers", async () => {
    await expect(controller.hide({ commentId: "comment-1" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("deletes comments after checking existence with a minimal select", async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: "comment-1" });
    prisma.comment.delete.mockResolvedValue({ id: "comment-1" });

    await expect(controller.remove("comment-1")).resolves.toEqual({ ok: true });

    expect(prisma.comment.findUnique).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      select: { id: true },
    });
    expect(prisma.comment.delete).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      select: { id: true },
    });
  });

  it("throws when deleting a missing comment", async () => {
    prisma.comment.findUnique.mockResolvedValue(null);

    await expect(controller.remove("missing-comment")).rejects.toBeInstanceOf(NotFoundException);
  });
});
