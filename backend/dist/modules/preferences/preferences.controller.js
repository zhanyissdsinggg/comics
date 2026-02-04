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
exports.PreferencesController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const auth_1 = require("../../common/utils/auth");
const errors_1 = require("../../common/utils/errors");
let PreferencesController = class PreferencesController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPreferences(req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const existing = await this.prisma.userPreference.findUnique({ where: { userId } });
        return {
            preferences: (existing === null || existing === void 0 ? void 0 : existing.payload) || {
                notifyNewEpisode: true,
                notifyTtfReady: true,
                notifyPromo: true,
            },
        };
    }
    async save(body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const payload = (body === null || body === void 0 ? void 0 : body.preferences) || {};
        const saved = await this.prisma.userPreference.upsert({
            where: { userId },
            update: { payload },
            create: { userId, payload },
        });
        return { preferences: saved.payload };
    }
};
exports.PreferencesController = PreferencesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "save", null);
exports.PreferencesController = PreferencesController = __decorate([
    (0, common_1.Controller)("preferences"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PreferencesController);
