import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(seriesId: string, userId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { seriesId, hidden: false },
      orderBy: { createdAt: "desc" },
      include: {
        likes: { select: { userId: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { email: true } } },
        },
        user: { select: { email: true } },
      },
    });
    return comments.map((comment) => this.decorate(comment, userId));
  }

  async add(seriesId: string, userId: string, text: string) {
    const comment = await this.prisma.comment.create({
      data: { seriesId, userId, text },
      include: { likes: { select: { userId: true } }, replies: true, user: { select: { email: true } } },
    });
    return this.decorate(comment, userId);
  }

  async like(_seriesId: string, commentId: string, userId: string) {
    const existing = await this.prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (existing) {
      await this.prisma.commentLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.commentLike.create({ data: { commentId, userId } });
    }
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        likes: { select: { userId: true } },
        replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { email: true } } } },
        user: { select: { email: true } },
      },
    });
    if (!comment) {
      return null;
    }
    return this.decorate(comment, userId);
  }

  async reply(_seriesId: string, commentId: string, userId: string, text: string) {
    const exists = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!exists) {
      return null;
    }
    await this.prisma.commentReply.create({ data: { commentId, userId, text } });
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        likes: { select: { userId: true } },
        replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { email: true } } } },
        user: { select: { email: true } },
      },
    });
    if (!comment) {
      return null;
    }
    return this.decorate(comment, userId);
  }

  private decorate(comment: any, userId: string) {
    const likes = Array.isArray(comment.likes) ? comment.likes : [];
    const replies = Array.isArray(comment.replies) ? comment.replies : [];
    return {
      id: comment.id,
      seriesId: comment.seriesId,
      userId: comment.userId,
      author: comment.user?.email || "Guest",
      text: comment.text,
      createdAt: comment.createdAt,
      likes: likes.map((like: any) => like.userId),
      replies: replies.map((reply: any) => ({
        id: reply.id,
        userId: reply.userId,
        author: reply.user?.email || "Guest",
        text: reply.text,
        createdAt: reply.createdAt,
      })),
      likeCount: likes.length,
      likedByUser: likes.some((like: any) => like.userId === userId),
    };
  }
}
