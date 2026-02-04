"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientIp = getClientIp;
function getClientIp(req) {
    var _a;
    const forwarded = req.headers["x-forwarded-for"];
    const raw = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === "string"
            ? forwarded.split(",")[0]
            : "";
    const ip = raw || ((_a = req.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress) || "";
    return String(ip).replace("::ffff:", "").trim();
}
