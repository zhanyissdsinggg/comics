import { Injectable } from '@nestjs/common';

/**
 * Comment数据转换Mapper - 统一处理Comment数据的装饰和转换
 * 这个SB方法之前在CommentsService中定义，现在提取出来复用
 */
@Injectable()
export class CommentMapper {
  /**
   * 装饰Comment数据，添加用户交互信息
   */
  decorate(comment: any, userId: string): any {
    const likes = Array.isArray(comment.likes) ? comment.likes : [];
    const replies = Array.isArray(comment.replies) ? comment.replies : [];

    return {
      id: comment.id,
      seriesId: comment.seriesId,
      userId: comment.userId,
      text: comment.text,
      createdAt: comment.createdAt,
      likes: likes.length,
      liked: likes.some((like: any) => like.userId === userId),
      replies: replies.map((reply: any) => ({
        id: reply.id,
        userId: reply.userId,
        text: reply.text,
        createdAt: reply.createdAt,
        userEmail: reply.user?.email || '',
      })),
      userEmail: comment.user?.email || '',
    };
  }

  /**
   * 批量装饰Comment列表
   */
  decorateList(comments: any[], userId: string): any[] {
    return comments.map((comment) => this.decorate(comment, userId));
  }

  /**
   * 获取Comment的标准include查询配置
   * 这个SB配置之前在3个地方重复定义，现在统一管理
   */
  getStandardInclude(): any {
    return {
      likes: { select: { userId: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { email: true } } },
      },
      user: { select: { email: true } },
    };
  }
}
