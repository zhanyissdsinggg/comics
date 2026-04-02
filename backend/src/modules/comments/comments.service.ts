import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CommentMapper } from "../../common/mappers/comment.mapper";

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commentMapper: CommentMapper,
  ) {}

  private async getDecoratedComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: this.commentMapper.getStandardInclude(),
    });

    if (!comment) {
      return null;
    }

    return this.commentMapper.decorate(comment, userId);
  }

  async list(seriesId: string, userId?: string) {
    const comments = await this.prisma.comment.findMany({
      where: { seriesId, hidden: false, isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: this.commentMapper.getStandardInclude(),
    });
    return this.commentMapper.decorateList(comments, userId || "");
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
    return this.getDecoratedComment(commentId, userId);
  }

  async reply(_seriesId: string, commentId: string, userId: string, text: string) {
    await this.prisma.commentReply.create({
      data: { commentId, userId, content: text },
    });

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
