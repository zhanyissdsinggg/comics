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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthController = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const admin_log_service_1 = require("../../common/services/admin-log.service");
let AdminAuthController = class AdminAuthController {
    constructor(jwtService, adminLogService) {
        this.jwtService = jwtService;
        this.adminLogService = adminLogService;
    }
    async login(body) {
        const { adminKey } = body;
        if (!adminKey) {
            throw new common_1.HttpException("管理员密钥不能为空", common_1.HttpStatus.BAD_REQUEST);
        }
        const correctAdminKey = process.env.ADMIN_KEY;
        if (adminKey !== correctAdminKey) {
            await this.adminLogService.log("login_failed", "auth", "admin", { reason: "Invalid admin key" });
            throw new common_1.HttpException("管理员密钥错误", common_1.HttpStatus.UNAUTHORIZED);
        }
        const accessToken = this.jwtService.sign({ role: "admin", timestamp: Date.now() }, { expiresIn: "1h" });
        const refreshToken = this.jwtService.sign({ role: "admin", type: "refresh", timestamp: Date.now() }, { expiresIn: "7d" });
        await this.adminLogService.log("login_success", "auth", "admin", { message: "Admin logged in successfully" });
        return {
            success: true,
            accessToken,
            refreshToken,
            expiresIn: 3600,
        };
    }
    async refresh(body) {
        const { refreshToken } = body;
        if (!refreshToken) {
            throw new common_1.HttpException("Refresh token不能为空", common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const payload = this.jwtService.verify(refreshToken);
            if (payload.type !== "refresh") {
                throw new common_1.HttpException("无效的refresh token", common_1.HttpStatus.UNAUTHORIZED);
            }
            const newAccessToken = this.jwtService.sign({ role: "admin", timestamp: Date.now() }, { expiresIn: "1h" });
            return {
                success: true,
                accessToken: newAccessToken,
                expiresIn: 3600,
            };
        }
        catch (error) {
            throw new common_1.HttpException("Refresh token无效或已过期", common_1.HttpStatus.UNAUTHORIZED);
        }
    }
    async verify(body) {
        const { token } = body;
        if (!token) {
            throw new common_1.HttpException("Token不能为空", common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const payload = this.jwtService.verify(token);
            return {
                success: true,
                valid: true,
                payload,
            };
        }
        catch (error) {
            return {
                success: false,
                valid: false,
                message: "Token无效或已过期",
            };
        }
    }
};
exports.AdminAuthController = AdminAuthController;
__decorate([
    (0, common_1.Post)("login"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)("refresh"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)("verify"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "verify", null);
exports.AdminAuthController = AdminAuthController = __decorate([
    (0, common_1.Controller)("admin/auth"),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        admin_log_service_1.AdminLogService])
], AdminAuthController);
