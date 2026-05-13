export function normalizeAdminRoutePath(value) {
  const path = String(value || "")
    .split("?")[0]
    .trim();
  return path || "/admin";
}

export function canAccessAdminRoute(pathname, routePatterns = []) {
  const normalizedPath = normalizeAdminRoutePath(pathname);
  const patterns = Array.isArray(routePatterns) ? routePatterns : [];

  return patterns.some((pattern) => {
    const normalizedPattern = String(pattern || "").trim();
    if (!normalizedPattern) {
      return false;
    }
    if (normalizedPattern === "*") {
      return true;
    }
    if (normalizedPattern === "/admin") {
      return normalizedPath === "/admin";
    }
    return (
      normalizedPath === normalizedPattern ||
      normalizedPath.startsWith(`${normalizedPattern}/`)
    );
  });
}

export function getAdminRoleLabel(adminRole) {
  switch (
    String(adminRole || "")
      .trim()
      .toLowerCase()
  ) {
    case "content_admin":
      return "内容运营";
    case "user_admin":
      return "用户管理";
    case "finance_admin":
      return "财务管理";
    case "support_admin":
      return "客服支持";
    case "marketing_admin":
      return "营销运营";
    case "ops_admin":
      return "系统运维";
    case "super_admin":
    default:
      return "超级管理员";
  }
}

export function buildAdminSession(session) {
  if (!session || typeof session !== "object") {
    return null;
  }

  const routePatterns = Array.isArray(session.routePatterns)
    ? session.routePatterns
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];

  const permissions = Array.isArray(session.permissions)
    ? session.permissions
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];

  return {
    adminId: String(session.adminId || "").trim(),
    adminRole:
      String(session.adminRole || "")
        .trim()
        .toLowerCase() || "super_admin",
    permissions,
    routePatterns,
    homePath: normalizeAdminRoutePath(session.homePath || "/admin"),
    adminName: String(session.adminName || "").trim() || null,
    adminEmail: String(session.adminEmail || "").trim() || null,
    memberStatus:
      String(session.memberStatus || "")
        .trim()
        .toLowerCase() || null,
    authMode: String(session.authMode || "").trim() || null,
    keySlot:
      session.keySlot !== null &&
      session.keySlot !== undefined &&
      session.keySlot !== "" &&
      Number.isFinite(Number(session.keySlot))
        ? Number(session.keySlot)
        : null,
    totpEnabled: Boolean(session.totpEnabled),
  };
}
