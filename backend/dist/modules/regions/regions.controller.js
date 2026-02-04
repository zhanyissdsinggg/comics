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
exports.RegionsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let RegionsController = class RegionsController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async config() {
        const config = await this.prisma.regionConfig.findUnique({ where: { key: "default" } });
        return {
            config: (config === null || config === void 0 ? void 0 : config.payload) ||
                {
                    countryCodes: [
                        { code: "+1", label: "US" },
                        { code: "+82", label: "KR" },
                        { code: "+86", label: "CN" },
                        { code: "+81", label: "JP" },
                        { code: "+65", label: "SG" },
                    ],
                    lengthRules: {
                        "+1": [10],
                        "+82": [9, 10, 11],
                        "+86": [11],
                        "+81": [9, 10, 11],
                        "+65": [8],
                    },
                },
        };
    }
};
exports.RegionsController = RegionsController;
__decorate([
    (0, common_1.Get)("config"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RegionsController.prototype, "config", null);
exports.RegionsController = RegionsController = __decorate([
    (0, common_1.Controller)("regions"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RegionsController);
