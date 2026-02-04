"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminAuthorized = isAdminAuthorized;
const ADMIN_KEY = process.env.ADMIN_KEY || "admin";
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
