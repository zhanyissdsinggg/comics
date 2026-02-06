"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminAuthorized = isAdminAuthorized;
function validateAdminKey(key) {
    if (!key || key.length < 16) {
        return false;
    }
    const hasUpperCase = /[A-Z]/.test(key);
    const hasLowerCase = /[a-z]/.test(key);
    const hasNumber = /[0-9]/.test(key);
    const hasSpecial = /[^A-Za-z0-9]/.test(key);
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
}
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
function isAdminAuthorized(req, body) {
    var _a;
    const keyFromQuery = (_a = req.query) === null || _a === void 0 ? void 0 : _a.key;
    const keyFromBody = body === null || body === void 0 ? void 0 : body.key;
    const headerKey = req.headers["x-admin-key"];
    const authHeader = req.headers.authorization;
    const bearer = typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7)
        : "";
    const key = (keyFromQuery || keyFromBody || headerKey || bearer || "").toString();
    return key === ADMIN_KEY;
}
