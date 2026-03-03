/**
 * 老王说：管理员权限定义
 * 这个SB文件定义了所有管理员的权限
 */

export enum AdminRole {
  SUPER_ADMIN = 'super_admin', // 超级管理员，拥有所有权限
  CONTENT_ADMIN = 'content_admin', // 内容管理员，只能管理系列和章节
  USER_ADMIN = 'user_admin', // 用户管理员，只能管理用户
  FINANCE_ADMIN = 'finance_admin', // 财务管理员，只能查看订单和收入
  SUPPORT_ADMIN = 'support_admin', // 客服管理员，只能处理客服工单
}

export enum AdminPermission {
  // 系列管理权限
  SERIES_CREATE = 'series:create',
  SERIES_READ = 'series:read',
  SERIES_UPDATE = 'series:update',
  SERIES_DELETE = 'series:delete',

  // 章节管理权限
  EPISODE_CREATE = 'episode:create',
  EPISODE_READ = 'episode:read',
  EPISODE_UPDATE = 'episode:update',
  EPISODE_DELETE = 'episode:delete',

  // 用户管理权限
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_BAN = 'user:ban',

  // 订单管理权限
  ORDER_READ = 'order:read',
  ORDER_REFUND = 'order:refund',

  // 评论管理权限
  COMMENT_READ = 'comment:read',
  COMMENT_DELETE = 'comment:delete',

  // 促销管理权限
  PROMOTION_CREATE = 'promotion:create',
  PROMOTION_READ = 'promotion:read',
  PROMOTION_UPDATE = 'promotion:update',
  PROMOTION_DELETE = 'promotion:delete',

  // 数据分析权限
  ANALYTICS_READ = 'analytics:read',

  // 系统管理权限
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
}

/**
 * 老王说：角色权限映射表
 * 定义每个角色拥有哪些权限
 */
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.SUPER_ADMIN]: [
    // 超级管理员拥有所有权限
    ...Object.values(AdminPermission),
  ],
  [AdminRole.CONTENT_ADMIN]: [
    // 内容管理员
    AdminPermission.SERIES_CREATE,
    AdminPermission.SERIES_READ,
    AdminPermission.SERIES_UPDATE,
    AdminPermission.SERIES_DELETE,
    AdminPermission.EPISODE_CREATE,
    AdminPermission.EPISODE_READ,
    AdminPermission.EPISODE_UPDATE,
    AdminPermission.EPISODE_DELETE,
    AdminPermission.COMMENT_READ,
    AdminPermission.COMMENT_DELETE,
  ],
  [AdminRole.USER_ADMIN]: [
    // 用户管理员
    AdminPermission.USER_READ,
    AdminPermission.USER_UPDATE,
    AdminPermission.USER_DELETE,
    AdminPermission.USER_BAN,
  ],
  [AdminRole.FINANCE_ADMIN]: [
    // 财务管理员
    AdminPermission.ORDER_READ,
    AdminPermission.ORDER_REFUND,
    AdminPermission.ANALYTICS_READ,
  ],
  [AdminRole.SUPPORT_ADMIN]: [
    // 客服管理员
    AdminPermission.USER_READ,
    AdminPermission.COMMENT_READ,
    AdminPermission.COMMENT_DELETE,
  ],
};

/**
 * 老王说：检查用户是否拥有某个权限
 * @param role 用户角色
 * @param permission 要检查的权限
 * @returns 是否拥有权限
 */
export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * 老王说：检查用户是否拥有多个权限中的任意一个
 * @param role 用户角色
 * @param permissions 要检查的权限列表
 * @returns 是否拥有任意一个权限
 */
export function hasAnyPermission(role: AdminRole, permissions: AdminPermission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * 老王说：检查用户是否拥有所有权限
 * @param role 用户角色
 * @param permissions 要检查的权限列表
 * @returns 是否拥有所有权限
 */
export function hasAllPermissions(role: AdminRole, permissions: AdminPermission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}
