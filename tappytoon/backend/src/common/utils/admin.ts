import { Request } from "express";

/**
 * 老王说：管理员密钥必须设置，不能用默认值
 * 安全要求：至少16个字符，包含大小写字母、数字、特殊字符
 */
function validateAdminKey(key: string): boolean {
  if (!key || key.length < 16) {
    return false;
  }
  // 检查是否包含大写字母
  const hasUpperCase = /[A-Z]/.test(key);
  // 检查是否包含小写字母
  const hasLowerCase = /[a-z]/.test(key);
  // 检查是否包含数字
  const hasNumber = /[0-9]/.test(key);
  // 检查是否包含特殊字符
  const hasSpecial = /[^A-Za-z0-9]/.test(key);

  return hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
}

// 老王说：启动时检查ADMIN_KEY环境变量，不符合要求就拒绝启动
const ADMIN_KEY = process.env.ADMIN_KEY || "";
if (!ADMIN_KEY) {
  console.error("❌ 致命错误：未设置ADMIN_KEY环境变量");
  console.error("请在.env文件中设置ADMIN_KEY，至少16个字符，包含大小写字母、数字、特殊字符");
  process.exit(1);
}

if (!validateAdminKey(ADMIN_KEY)) {
  console.error("❌ 致命错误：ADMIN_KEY不符合安全要求");
  console.error("要求：至少16个字符，必须包含大小写字母、数字、特殊字符");
  console.error("示例：MySecureAdm1nK3y!2024");
  process.exit(1);
}

console.log("✅ 管理员密钥验证通过");

export function isAdminAuthorized(req: Request, body?: any) {
  // 老王说：优先检查JWT认证（middleware设置的req.user）
  const user = (req as any).user;
  if (user && user.role === "admin") {
    return true;
  }

  // 老王说：如果JWT认证失败，尝试旧的密钥认证（向后兼容）
  const keyFromQuery = req.query?.key;
  const keyFromBody = body?.key;
  const headerKey = req.headers["x-admin-key"];
  const authHeader = req.headers.authorization;
  const bearer =
    typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7)
      : "";
  const key = (keyFromQuery || keyFromBody || headerKey || bearer || "").toString();
  return key === ADMIN_KEY;
}
