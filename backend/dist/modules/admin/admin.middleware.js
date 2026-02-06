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
        if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
            const token = authHeader.slice(7);
            try {
                const payload = this.jwtService.verify(token, {
                    secret: process.env.JWT_SECRET || "tappytoon-jwt-secret-change-me"
                });
                if (payload.sub && payload.role === "admin") {
                    req.user = {
                        userId: payload.sub,
                        username: payload.username,
                        role: payload.role
                    };
                    next();
                    return;
                }
            }
            catch (error) {
            }
        }
        if ((0, admin_1.isAdminAuthorized)(req, req.body)) {
            next();
            return;
        }
        res.status(403).json({ error: "FORBIDDEN" });
    }
};
exports.AdminKeyMiddleware = AdminKeyMiddleware;
exports.AdminKeyMiddleware = AdminKeyMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], AdminKeyMiddleware);
