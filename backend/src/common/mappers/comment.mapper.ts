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
    const author = comment.author || comment.user?.email || comment.userEmail || 'Guest';
    const likeCount =
      typeof comment.likeCount === 'number'
        ? comment.likeCount
        : likes.length;
    const likedByUser =
      typeof comment.likedByUser === 'boolean'
        ? comment.likedByUser
        : typeof comment.liked === 'boolean'
          ? comment.liked
          : likes.some((like: any) =>
              typeof like === 'string' ? like === userId : like.userId === userId,
            );

    return {
      id: comment.id,
      seriesId: comment.seriesId,
      userId: comment.userId,
      text: String(comment.text || comment.content || ""),
      createdAt: comment.createdAt,
      author,
      userEmail: author,
      likeCount,
      likes: likeCount,
      likedByUser,
      liked: likedByUser,
      replies: replies.map((reply: any) => ({
        id: reply.id,
        userId: reply.userId,
        text: String(reply.text || reply.content || ""),
        createdAt: reply.createdAt,
        author: reply.author || reply.user?.email || reply.userEmail || 'Guest',
        userEmail: reply.author || reply.user?.email || reply.userEmail || 'Guest',
      })),
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
