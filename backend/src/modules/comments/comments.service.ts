import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CommentMapper } from "../../common/mappers/comment.mapper";

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commentMapper: CommentMapper,
  ) {}

  private isSchemaDriftError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return error.code === "P2021" || error.code === "P2022";
    }

    const message = String((error as { message?: string }).message || "");
    return (
      message.includes("does not exist") ||
      message.includes("Unknown column") ||
      message.includes("column") ||
      message.includes("relation")
    );
  }

  private async listFallback(seriesId: string, userId?: string) {
    const comments = await this.prisma.$queryRawUnsafe<any[]>(
      `
        SELECT
          c.id,
          c."seriesId",
          c."userId",
          COALESCE(c.text, c.content, '') AS text,
          c."createdAt",
          u.email AS "userEmail"
        FROM "comments" c
        LEFT JOIN "users" u ON u.id = c."userId"
        WHERE c."seriesId" = $1
          AND COALESCE(c.hidden, false) = false
        ORDER BY c."createdAt" DESC
      `,
      seriesId,
    );

    if (comments.length === 0) {
      return [];
    }

    const commentIds = comments.map((comment) => comment.id);
    const placeholders = commentIds.map((_, index) => `$${index + 1}`).join(", ");

    const likes = await this.prisma.$queryRawUnsafe<any[]>(
      `
        SELECT "commentId", "userId"
        FROM "comment_likes"
        WHERE "commentId" IN (${placeholders})
      `,
      ...commentIds,
    );

    const replies = await this.prisma.$queryRawUnsafe<any[]>(
      `
        SELECT
          r.id,
          r."commentId",
          r."userId",
          COALESCE(r.text, r.content, '') AS text,
          r."createdAt",
          u.email AS "userEmail"
        FROM "comment_replies" r
        LEFT JOIN "users" u ON u.id = r."userId"
        WHERE r."commentId" IN (${placeholders})
        ORDER BY r."createdAt" ASC
      `,
      ...commentIds,
    );

    const likesByCommentId = new Map<string, any[]>();
    likes.forEach((like) => {
      const list = likesByCommentId.get(like.commentId) || [];
      list.push(like);
      likesByCommentId.set(like.commentId, list);
    });

    const repliesByCommentId = new Map<string, any[]>();
    replies.forEach((reply) => {
      const list = repliesByCommentId.get(reply.commentId) || [];
      list.push({
        ...reply,
        user: { email: reply.userEmail || "" },
      });
      repliesByCommentId.set(reply.commentId, list);
    });

    return comments.map((comment) =>
      this.commentMapper.decorate(
        {
          ...comment,
          likes: likesByCommentId.get(comment.id) || [],
          replies: repliesByCommentId.get(comment.id) || [],
          user: { email: comment.userEmail || "" },
        },
        userId || "",
      ),
    );
  }

  private async getDecoratedComment(commentId: string, userId: string) {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id: commentId },
        include: this.commentMapper.getStandardInclude(),
      });

      if (!comment) {
        return null;
      }

      return this.commentMapper.decorate(comment, userId);
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Comment lookup failed for ${commentId}, switching to compatibility mode.`,
      );
    }

    const comments = await this.prisma.$queryRawUnsafe<any[]>(
      `
        SELECT
          c.id,
          c."seriesId",
          c."userId",
          COALESCE(c.text, c.content, '') AS text,
          c."createdAt",
          u.email AS "userEmail"
        FROM "comments" c
        LEFT JOIN "users" u ON u.id = c."userId"
        WHERE c.id = $1
        LIMIT 1
      `,
      commentId,
    );

    const comment = comments[0];
    if (!comment) {
      return null;
    }

    const likes = await this.prisma.$queryRawUnsafe<any[]>(
      `
        SELECT "userId"
        FROM "comment_likes"
        WHERE "commentId" = $1
      `,
      commentId,
    );

    const replies = await this.prisma.$queryRawUnsafe<any[]>(
      `
        SELECT
          r.id,
          r."userId",
          COALESCE(r.text, r.content, '') AS text,
          r."createdAt",
          u.email AS "userEmail"
        FROM "comment_replies" r
        LEFT JOIN "users" u ON u.id = r."userId"
        WHERE r."commentId" = $1
        ORDER BY r."createdAt" ASC
      `,
      commentId,
    );

    return this.commentMapper.decorate(
      {
        ...comment,
        likes,
        replies: replies.map((reply) => ({
          ...reply,
          user: { email: reply.userEmail || "" },
        })),
        user: { email: comment.userEmail || "" },
      },
      userId,
    );
  }

  private async addCompat(seriesId: string, userId: string, text: string) {
    const commentId = `comment_${randomUUID()}`;
    const insertVariants = [
      `
        INSERT INTO "comments" ("id", "userId", "seriesId", "content", "text", "hidden", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $4, false, NOW(), NOW())
      `,
      `
        INSERT INTO "comments" ("id", "userId", "seriesId", "content", "hidden", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, false, NOW(), NOW())
      `,
      `
        INSERT INTO "comments" ("id", "userId", "seriesId", "content", "text", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $4, NOW(), NOW())
      `,
      `
        INSERT INTO "comments" ("id", "userId", "seriesId", "content", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `,
    ];

    let lastError: unknown = null;
    for (const query of insertVariants) {
      try {
        await this.prisma.$executeRawUnsafe(query, commentId, userId, seriesId, text);
        return this.getDecoratedComment(commentId, userId);
      } catch (error) {
        lastError = error;
        if (!this.isSchemaDriftError(error)) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  async list(seriesId: string, userId?: string) {
    try {
      const comments = await this.prisma.comment.findMany({
        where: { seriesId, hidden: false, isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: this.commentMapper.getStandardInclude(),
      });
      return this.commentMapper.decorateList(comments, userId || "");
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Comments full query failed for series ${seriesId}, switching to compatibility mode.`,
      );
    }

    try {
      const comments = await this.prisma.comment.findMany({
        where: { seriesId },
        orderBy: { createdAt: "desc" },
        include: this.commentMapper.getStandardInclude(),
      });
      return this.commentMapper.decorateList(comments, userId || "");
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Comments include query failed for series ${seriesId}, using minimal fallback.`,
      );
    }

    return this.listFallback(seriesId, userId);
  }

  async add(seriesId: string, userId: string, text: string) {
    try {
      const comment = await this.prisma.comment.create({
        data: { seriesId, userId, content: text },
        include: this.commentMapper.getStandardInclude(),
      });
      return this.commentMapper.decorate(comment, userId);
    } catch (error) {
      if (!this.isSchemaDriftError(error)) {
        throw error;
      }
      this.logger.warn(
        `Comment create failed for series ${seriesId}, switching to compatibility mode.`,
      );
      return this.addCompat(seriesId, userId, text);
    }
  }

  async like(_seriesId: string, commentId: string, userId: string) {
    await this.prisma.commentLike.upsert({
      where: { commentId_userId: { commentId, userId } },
      update: {},
      create: { commentId, userId },
    });
    return this.getDecoratedComment(commentId, userId);
  }

  async reply(_seriesId: string, commentId: string, userId: string, text: string) {
    try {
      await this.prisma.commentReply.create({
        data: { commentId, userId, content: text },
      });
    } catch {
      return null;
    }

    return this.getDecoratedComment(commentId, userId);
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.userId !== userId) {
      return null;
    }

    const deleted = await this.prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: true },
      include: this.commentMapper.getStandardInclude(),
    });

    return this.commentMapper.decorate(deleted, userId);
  }
}
