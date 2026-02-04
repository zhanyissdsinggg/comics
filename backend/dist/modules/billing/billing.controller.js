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
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const topup_1 = require("../../common/config/topup");
const plans_1 = require("../../common/config/plans");
let BillingController = class BillingController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listTopups() {
        const packages = await (0, topup_1.listTopupPackages)(this.prisma);
        return { packages };
    }
    async listPlans() {
        const catalog = await (0, plans_1.getPlanCatalog)(this.prisma);
        return { plans: Object.values(catalog) };
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Get)("topups"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "listTopups", null);
__decorate([
    (0, common_1.Get)("plans"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "listPlans", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)("billing"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BillingController);
