"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminKeyMiddleware = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
const jwt_1 = require("@nestjs/jwt");
let AdminKeyMiddleware = class AdminKeyMiddleware {
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    use(req, res, next) {
        const authHeader = req.headers.authorization;
        console.log("[AdminKeyMiddleware] Authorization header:", authHeader ? "存在" : "不存在");
        if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
            const token = authHeader.slice(7);
            console.log("[AdminKeyMiddleware] Token前20个字符:", token.substring(0, 20));
            try {
                const payload = this.jwtService.verify(token);
                console.log("[AdminKeyMiddleware] JWT验证成功，payload:", JSON.stringify(payload));
                if (payload.role === "admin") {
                    console.log("[AdminKeyMiddleware] 认证通过，role是admin");
                    req.user = {
                        userId: "admin",
                        role: payload.role
                    };
                    next();
                    return;
                }
                else {
                    console.log("[AdminKeyMiddleware] 认证失败，role不是admin:", payload.role);
                }
            }
            catch (error) {
                console.error("[AdminKeyMiddleware] JWT验证失败:", error.message);
                console.error("[AdminKeyMiddleware] 错误详情:", error);
            }
        }
        console.log("[AdminKeyMiddleware] 尝试旧的密钥认证");
        if ((0, admin_1.isAdminAuthorized)(req, req.body)) {
            console.log("[AdminKeyMiddleware] 密钥认证通过");
            next();
            return;
        }
        console.log("[AdminKeyMiddleware] 所有认证方式都失败，返回403");
        res.status(403).json({ error: "FORBIDDEN" });
    }
};
exports.AdminKeyMiddleware = AdminKeyMiddleware;
exports.AdminKeyMiddleware = AdminKeyMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], AdminKeyMiddleware);
