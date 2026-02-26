/**
 * 分页工具函数
 * 用于统一处理所有列表查询的分页逻辑
 */

export interface PaginationParams {
  page?: number | string;
  pageSize?: number | string;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * 解析分页参数
 */
export function parsePaginationParams(params: PaginationParams, defaultPageSize = 20) {
  let page = parseInt(String(params.page || 1));
  let pageSize = parseInt(String(params.pageSize || defaultPageSize));

  // 验证参数有效性
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(pageSize) || pageSize < 1) pageSize = defaultPageSize;
  if (pageSize > 100) pageSize = 100; // 最大100条

  return { page, pageSize };
}

/**
 * 计算分页偏移量
 */
export function calculateOffset(page: number, pageSize: number) {
  return (page - 1) * pageSize;
}

/**
 * 构建分页结果
 */
export function buildPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
