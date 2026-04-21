export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  CONTENT_ADMIN = "content_admin",
  USER_ADMIN = "user_admin",
  FINANCE_ADMIN = "finance_admin",
  SUPPORT_ADMIN = "support_admin",
  MARKETING_ADMIN = "marketing_admin",
  OPS_ADMIN = "ops_admin",
}

export enum AdminPermission {
  DASHBOARD_READ = "dashboard:read",
  ANALYTICS_READ = "analytics:read",

  SERIES_CREATE = "series:create",
  SERIES_READ = "series:read",
  SERIES_UPDATE = "series:update",
  SERIES_DELETE = "series:delete",

  EPISODE_CREATE = "episode:create",
  EPISODE_READ = "episode:read",
  EPISODE_UPDATE = "episode:update",
  EPISODE_DELETE = "episode:delete",

  CREATOR_READ = "creator:read",
  CREATOR_UPDATE = "creator:update",

  INTERACTIVE_STORY_READ = "interactive-story:read",
  INTERACTIVE_STORY_CREATE = "interactive-story:create",
  INTERACTIVE_STORY_UPDATE = "interactive-story:update",
  INTERACTIVE_STORY_DELETE = "interactive-story:delete",

  COMMENT_READ = "comment:read",
  COMMENT_UPDATE = "comment:update",
  COMMENT_DELETE = "comment:delete",

  RECOMMENDATION_READ = "recommendation:read",
  RECOMMENDATION_UPDATE = "recommendation:update",

  PROMOTION_CREATE = "promotion:create",
  PROMOTION_READ = "promotion:read",
  PROMOTION_UPDATE = "promotion:update",
  PROMOTION_DELETE = "promotion:delete",

  MARKETING_READ = "marketing:read",
  MARKETING_UPDATE = "marketing:update",

  USER_READ = "user:read",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",
  USER_BAN = "user:ban",

  ORDER_READ = "order:read",
  ORDER_REFUND = "order:refund",
  ORDER_UPDATE = "order:update",
  ORDER_DELETE = "order:delete",

  BILLING_READ = "billing:read",
  BILLING_UPDATE = "billing:update",
  REVENUE_READ = "revenue:read",

  SUPPORT_READ = "support:read",
  SUPPORT_UPDATE = "support:update",
  SUPPORT_DELETE = "support:delete",

  NOTIFICATION_READ = "notification:read",
  NOTIFICATION_UPDATE = "notification:update",
  NOTIFICATION_DELETE = "notification:delete",

  SYSTEM_CONFIG = "system:config",
  SYSTEM_LOGS = "system:logs",
  TRACKING_CONFIG = "tracking:config",
  REGION_CONFIG = "region:config",
  EMAIL_READ = "email:read",
  EMAIL_UPDATE = "email:update",
  EMAIL_JOB_READ = "email-job:read",
  EMAIL_JOB_UPDATE = "email-job:update",
  UPLOAD_ASSET = "upload:asset",
  CONTENT_GENERATE = "content:generate",
  ADMIN_MEMBER_READ = "admin-member:read",
  ADMIN_MEMBER_CREATE = "admin-member:create",
  ADMIN_MEMBER_UPDATE = "admin-member:update",
}

const ALL_PERMISSIONS = Object.values(AdminPermission);

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.SUPER_ADMIN]: ALL_PERMISSIONS,
  [AdminRole.CONTENT_ADMIN]: [
    AdminPermission.DASHBOARD_READ,
    AdminPermission.ANALYTICS_READ,
    AdminPermission.SERIES_CREATE,
    AdminPermission.SERIES_READ,
    AdminPermission.SERIES_UPDATE,
    AdminPermission.SERIES_DELETE,
    AdminPermission.EPISODE_CREATE,
    AdminPermission.EPISODE_READ,
    AdminPermission.EPISODE_UPDATE,
    AdminPermission.EPISODE_DELETE,
    AdminPermission.CREATOR_READ,
    AdminPermission.CREATOR_UPDATE,
    AdminPermission.INTERACTIVE_STORY_READ,
    AdminPermission.INTERACTIVE_STORY_CREATE,
    AdminPermission.INTERACTIVE_STORY_UPDATE,
    AdminPermission.INTERACTIVE_STORY_DELETE,
    AdminPermission.COMMENT_READ,
    AdminPermission.COMMENT_UPDATE,
    AdminPermission.COMMENT_DELETE,
    AdminPermission.RECOMMENDATION_READ,
    AdminPermission.RECOMMENDATION_UPDATE,
    AdminPermission.PROMOTION_CREATE,
    AdminPermission.PROMOTION_READ,
    AdminPermission.PROMOTION_UPDATE,
    AdminPermission.PROMOTION_DELETE,
    AdminPermission.UPLOAD_ASSET,
    AdminPermission.CONTENT_GENERATE,
  ],
  [AdminRole.USER_ADMIN]: [
    AdminPermission.DASHBOARD_READ,
    AdminPermission.ANALYTICS_READ,
    AdminPermission.USER_READ,
    AdminPermission.USER_UPDATE,
    AdminPermission.USER_DELETE,
    AdminPermission.USER_BAN,
  ],
  [AdminRole.FINANCE_ADMIN]: [
    AdminPermission.DASHBOARD_READ,
    AdminPermission.ANALYTICS_READ,
    AdminPermission.ORDER_READ,
    AdminPermission.ORDER_REFUND,
    AdminPermission.ORDER_UPDATE,
    AdminPermission.ORDER_DELETE,
    AdminPermission.BILLING_READ,
    AdminPermission.BILLING_UPDATE,
    AdminPermission.REVENUE_READ,
  ],
  [AdminRole.SUPPORT_ADMIN]: [
    AdminPermission.DASHBOARD_READ,
    AdminPermission.USER_READ,
    AdminPermission.COMMENT_READ,
    AdminPermission.COMMENT_UPDATE,
    AdminPermission.COMMENT_DELETE,
    AdminPermission.SUPPORT_READ,
    AdminPermission.SUPPORT_UPDATE,
    AdminPermission.SUPPORT_DELETE,
    AdminPermission.NOTIFICATION_READ,
    AdminPermission.NOTIFICATION_UPDATE,
    AdminPermission.NOTIFICATION_DELETE,
  ],
  [AdminRole.MARKETING_ADMIN]: [
    AdminPermission.DASHBOARD_READ,
    AdminPermission.ANALYTICS_READ,
    AdminPermission.RECOMMENDATION_READ,
    AdminPermission.RECOMMENDATION_UPDATE,
    AdminPermission.PROMOTION_CREATE,
    AdminPermission.PROMOTION_READ,
    AdminPermission.PROMOTION_UPDATE,
    AdminPermission.PROMOTION_DELETE,
    AdminPermission.MARKETING_READ,
    AdminPermission.MARKETING_UPDATE,
  ],
  [AdminRole.OPS_ADMIN]: [
    AdminPermission.DASHBOARD_READ,
    AdminPermission.SYSTEM_CONFIG,
    AdminPermission.SYSTEM_LOGS,
    AdminPermission.TRACKING_CONFIG,
    AdminPermission.REGION_CONFIG,
    AdminPermission.EMAIL_READ,
    AdminPermission.EMAIL_UPDATE,
    AdminPermission.EMAIL_JOB_READ,
    AdminPermission.EMAIL_JOB_UPDATE,
    AdminPermission.UPLOAD_ASSET,
  ],
};

const ROLE_ROUTE_PATTERNS: Record<AdminRole, string[]> = {
  [AdminRole.SUPER_ADMIN]: ["*"],
  [AdminRole.CONTENT_ADMIN]: [
    "/admin",
    "/admin/analytics",
    "/admin/series",
    "/admin/interactive-stories",
    "/admin/creators",
    "/admin/storefront",
    "/admin/merchandising",
    "/admin/recommendations",
    "/admin/comments",
    "/admin/promotions",
    "/admin/content-generator",
  ],
  [AdminRole.USER_ADMIN]: [
    "/admin",
    "/admin/analytics",
    "/admin/users",
  ],
  [AdminRole.FINANCE_ADMIN]: [
    "/admin",
    "/admin/analytics",
    "/admin/orders",
    "/admin/revenue",
    "/admin/billing",
  ],
  [AdminRole.SUPPORT_ADMIN]: [
    "/admin",
    "/admin/users",
    "/admin/support",
    "/admin/notifications",
    "/admin/comments",
  ],
  [AdminRole.MARKETING_ADMIN]: [
    "/admin",
    "/admin/analytics",
    "/admin/storefront",
    "/admin/merchandising",
    "/admin/recommendations",
    "/admin/promotions",
    "/admin/marketing",
  ],
  [AdminRole.OPS_ADMIN]: [
    "/admin",
    "/admin/branding",
    "/admin/email-settings",
    "/admin/email-jobs",
    "/admin/tracking",
    "/admin/regions",
    "/admin/settings",
    "/admin/logs",
  ],
};

const ROLE_HOME_PATH: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: "/admin",
  [AdminRole.CONTENT_ADMIN]: "/admin/series",
  [AdminRole.USER_ADMIN]: "/admin/users",
  [AdminRole.FINANCE_ADMIN]: "/admin/revenue",
  [AdminRole.SUPPORT_ADMIN]: "/admin/support",
  [AdminRole.MARKETING_ADMIN]: "/admin/marketing",
  [AdminRole.OPS_ADMIN]: "/admin/settings",
};

function normalizePath(pathname: string): string {
  const path = String(pathname || "").split("?")[0].trim();
  return path || "/admin";
}

function matchesRoutePattern(pathname: string, pattern: string): boolean {
  if (pattern === "*") {
    return true;
  }

  const normalizedPath = normalizePath(pathname);
  if (pattern === "/admin") {
    return normalizedPath === "/admin";
  }

  return normalizedPath === pattern || normalizedPath.startsWith(`${pattern}/`);
}

export function isAdminRole(value: unknown): value is AdminRole {
  return Object.values(AdminRole).includes(value as AdminRole);
}

export function normalizeAdminRole(
  value: unknown,
  fallback: AdminRole = AdminRole.SUPER_ADMIN,
): AdminRole {
  const normalized = String(value || "").trim().toLowerCase();
  return isAdminRole(normalized) ? normalized : fallback;
}

export function getRolePermissions(role: AdminRole): AdminPermission[] {
  return [...(ROLE_PERMISSIONS[normalizeAdminRole(role)] || ROLE_PERMISSIONS[AdminRole.SUPER_ADMIN])];
}

export function getAdminRoutePatterns(role: AdminRole): string[] {
  return [...(ROLE_ROUTE_PATTERNS[normalizeAdminRole(role)] || ROLE_ROUTE_PATTERNS[AdminRole.SUPER_ADMIN])];
}

export function resolveAdminHomePath(role: AdminRole): string {
  return ROLE_HOME_PATH[normalizeAdminRole(role)] || ROLE_HOME_PATH[AdminRole.SUPER_ADMIN];
}

export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  return getRolePermissions(role).includes(permission);
}

export function hasAnyPermission(role: AdminRole, permissions: AdminPermission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(role: AdminRole, permissions: AdminPermission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function canAccessAdminRoute(role: AdminRole, pathname: string): boolean {
  return getAdminRoutePatterns(role).some((pattern) => matchesRoutePattern(pathname, pattern));
}

export function buildAdminSessionProfile(
  adminId: string,
  adminRole: AdminRole,
  extras?: Partial<{
    adminName: string | null;
    adminEmail: string | null;
    memberStatus: string | null;
    authMode: string | null;
    keySlot: number | null;
    totpEnabled: boolean;
  }>,
) {
  const normalizedRole = normalizeAdminRole(adminRole);
  return {
    adminId,
    adminRole: normalizedRole,
    permissions: getRolePermissions(normalizedRole),
    routePatterns: getAdminRoutePatterns(normalizedRole),
    homePath: resolveAdminHomePath(normalizedRole),
    adminName: typeof extras?.adminName === "string" ? extras.adminName : null,
    adminEmail: typeof extras?.adminEmail === "string" ? extras.adminEmail : null,
    memberStatus: typeof extras?.memberStatus === "string" ? extras.memberStatus : null,
    authMode: typeof extras?.authMode === "string" ? extras.authMode : null,
    keySlot: typeof extras?.keySlot === "number" ? extras.keySlot : null,
    totpEnabled: Boolean(extras?.totpEnabled),
  };
}
