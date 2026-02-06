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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
let AuthService = class AuthService {
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    async login(adminKey) {
        const ADMIN_KEY = process.env.ADMIN_KEY || "";
        if (!adminKey || adminKey !== ADMIN_KEY) {
            throw new common_1.UnauthorizedException("管理员密钥错误");
        }
        const payload = {
            sub: "admin",
            username: "admin",
            role: "admin"
        };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: "1h"
        });
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: "7d"
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: 3600
        };
    }
    async refresh(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            if (!payload.sub || payload.role !== "admin") {
                throw new common_1.UnauthorizedException("无效的刷新token");
            }
            const newPayload = {
                sub: payload.sub,
                username: payload.username,
                role: payload.role
            };
            const accessToken = this.jwtService.sign(newPayload, {
                expiresIn: "1h"
            });
            return {
                accessToken,
                expiresIn: 3600
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException("刷新token无效或已过期");
        }
    }
    async validateToken(token) {
        try {
            const payload = this.jwtService.verify(token);
            return !!payload.sub && payload.role === "admin";
        }
        catch (error) {
            return false;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], AuthService);
