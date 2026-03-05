import { Injectable, Logger } from "@nestjs/common";
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
    const comments = await this.prisma.comment.findMany({
      where: { seriesId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        seriesId: true,
        userId: true,
        text: true,
        content: true,
        createdAt: true,
      },
    });

    return comments.map((comment) =>
      this.commentMapper.decorate(
        {
          ...comment,
          likes: [],
          replies: [],
          user: null,
          text: comment.text || comment.content || "",
        },
        userId || ""
      )
    );
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
    const comment = await this.prisma.comment.create({
      data: { seriesId, userId, content: text },
      include: this.commentMapper.getStandardInclude(),
    });
    return this.commentMapper.decorate(comment, userId);
  }

  async like(_seriesId: string, commentId: string, userId: string) {
    await this.prisma.commentLike.upsert({
      where: { commentId_userId: { commentId, userId } },
      update: {},
      create: { commentId, userId },
    });

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: this.commentMapper.getStandardInclude(),
    });

    if (!comment) {
      return null;
    }

    return this.commentMapper.decorate(comment, userId);
  }

  async reply(_seriesId: string, commentId: string, userId: string, text: string) {
    try {
      await this.prisma.commentReply.create({
        data: { commentId, userId, content: text },
      });
    } catch {
      return null;
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: this.commentMapper.getStandardInclude(),
    });

    if (!comment) {
      return null;
    }

    return this.commentMapper.decorate(comment, userId);
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
