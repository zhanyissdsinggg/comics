import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PaginationDto, PaginatedResponseDto } from '../dtos/common.dto';

/**
 * 老王注释：通用CRUD服务 - 所有admin模块都用这个
 * 这个SB服务处理所有通用的CRUD操作，减少每个controller的重复代码
 * 支持分页、排序、搜索、过滤等常用功能
 */
@Injectable()
export class CrudService {
  constructor(private prisma: PrismaService) {}

  /**
   * 老王说：获取列表数据，支持分页、排序、搜索
   */
  async findAll<T>(
    model: string,
    paginationDto: PaginationDto,
    searchFields: string[] = [],
    filters: Record<string, any> = {},
  ): Promise<PaginatedResponseDto<T>> {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = paginationDto;

    // 老王说：构建搜索条件
    const where: any = { ...filters };
    if (search && searchFields.length > 0) {
      where.OR = searchFields.map((field) => ({
        [field]: {
          contains: search,
          mode: 'insensitive',
        },
      }));
    }

    // 老王说：构建排序条件
    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    // 老王说：计算分页
    const skip = (page - 1) * limit;

    // 老王说：并行查询总数和数据
    const [data, total] = await Promise.all([
      (this.prisma as any)[model].findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      (this.prisma as any)[model].count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: '获取成功',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 老王说：获取单条数据
   */
  async findOne<T>(model: string, id: string): Promise<T> {
    return (this.prisma as any)[model].findUnique({
      where: { id },
    });
  }

  /**
   * 老王说：创建数据
   */
  async create<T>(model: string, data: any): Promise<T> {
    return (this.prisma as any)[model].create({
      data,
    });
  }

  /**
   * 老王说：更新数据
   */
  async update<T>(model: string, id: string, data: any): Promise<T> {
    return (this.prisma as any)[model].update({
      where: { id },
      data,
    });
  }

  /**
   * 老王说：删除数据
   */
  async delete<T>(model: string, id: string): Promise<T> {
    return (this.prisma as any)[model].delete({
      where: { id },
    });
  }

  /**
   * 老王说：批量删除数据
   */
  async deleteMany(model: string, ids: string[]): Promise<{ count: number }> {
    return (this.prisma as any)[model].deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  /**
   * 老王说：批量更新数据
   */
  async updateMany(model: string, ids: string[], data: any): Promise<{ count: number }> {
    return (this.prisma as any)[model].updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data,
    });
  }

  /**
   * 老王说：Upsert操作（存在则更新，不存在则创建）
   */
  async upsert<T>(model: string, id: string, data: any): Promise<T> {
    return (this.prisma as any)[model].upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  /**
   * 老王说：统计数据
   */
  async count(model: string, filters: Record<string, any> = {}): Promise<number> {
    return (this.prisma as any)[model].count({
      where: filters,
    });
  }
}
