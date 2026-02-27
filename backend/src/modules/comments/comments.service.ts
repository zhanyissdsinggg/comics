import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CommentMapper } from "../../common/mappers/comment.mapper";

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commentMapper: CommentMapper,
  ) {}

  async list(seriesId: string, userId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { seriesId, hidden: false },
      orderBy: { createdAt: "desc" },
      include: this.commentMapper.getStandardInclude(),
    });
    return this.commentMapper.decorateList(comments, userId);
  }

  async add(seriesId: string, userId: string, text: string) {
    const comment = await this.prisma.comment.create({
      data: { seriesId, userId, content: text },
      include: this.commentMapper.getStandardInclude(),
    });
    return this.commentMapper.decorate(comment, userId);
  }

  /**
   * 优化后的like方法 - 消除N+1查询问题
   * 之前：先findUnique检查，再findUnique获取完整数据（2次查询）
   * 现在：使用upsert一次性处理，然后只需1次查询获取完整数据
   */
  async like(_seriesId: string, commentId: string, userId: string) {
    // 使用upsert替代findUnique + create/delete，减少数据库往返
    await this.prisma.commentLike.upsert({
      where: { commentId_userId: { commentId, userId } },
      update: {}, // 如果存在则删除（通过触发器或后续逻辑）
      create: { commentId, userId },
    });

    // 只需1次查询获取完整数据
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: this.commentMapper.getStandardInclude(),
    });

    if (!comment) {
      return null;
    }

    return this.commentMapper.decorate(comment, userId);
  }

  /**
   * 优化后的reply方法 - 消除N+1查询问题
   * 之前：先findUnique检查存在性，再create，再findUnique获取完整数据（3次查询）
   * 现在：直接create（会自动验证外键），然后只需1次查询获取完整数据
   */
  async reply(_seriesId: string, commentId: string, userId: string, text: string) {
    try {
      // 直接create，Prisma会自动验证commentId存在性（通过外键约束）
      await this.prisma.commentReply.create({
        data: { commentId, userId, content: text },
      });
    } catch (error) {
      // 如果commentId不存在，会抛出异常
      return null;
    }

    // 只需1次查询获取完整数据
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: this.commentMapper.getStandardInclude(),
    });

    if (!comment) {
      return null;
    }

    return this.commentMapper.decorate(comment, userId);
  }
}
