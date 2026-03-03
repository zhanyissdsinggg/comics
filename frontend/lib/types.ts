/**
 * 老王说：通用类型定义
 * 统一的类型定义，防止类型混乱和重复定义
 */

// ============ API响应类型 ============

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============ 用户相关类型 ============

export interface User {
  id: string;
  email: string;
  name?: string;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  avatar?: string;
  bio?: string;
}

// ============ 订单相关类型 ============

export interface Order {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  currency: string;
  status: string;
  priceSnapshot: number;
  idempotencyKey?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  provider: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ 钱包相关类型 ============

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  paidPts: number;
  bonusPts: number;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ 内容相关类型 ============

export interface Series {
  id: string;
  title: string;
  type: string;
  description?: string;
  coverUrl?: string;
  adult: boolean;
  status: string;
  rating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Episode {
  id: string;
  seriesId: string;
  title: string;
  number: number;
  pricePts: number;
  ttfEligible: boolean;
  releasedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  seriesId: string;
  content: string;
  hidden: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============ 通用工具类型 ============

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncFunction<T = void> = () => Promise<T>;
export type SyncFunction<T = void> = () => T;

export interface PageInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SortOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface FilterOptions {
  [key: string]: any;
}

export interface QueryOptions extends SortOptions, FilterOptions {
  page?: number;
  pageSize?: number;
}

// ============ 错误类型 ============

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  requestId?: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}
