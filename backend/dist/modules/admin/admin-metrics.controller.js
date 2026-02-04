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
exports.AdminMetricsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const order_status_1 = require("../../common/utils/order-status");
let AdminMetricsController = class AdminMetricsController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMetrics(_req, _res) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [paidOrders, failedOrders, pendingOrders, retryPending, dau] = await Promise.all([
            this.prisma.order.count({
                where: { status: order_status_1.ORDER_STATUS.PAID, createdAt: { gte: start } },
            }),
            this.prisma.order.count({
                where: { status: order_status_1.ORDER_STATUS.FAILED, createdAt: { gte: start } },
            }),
            this.prisma.order.count({
                where: { status: order_status_1.ORDER_STATUS.PENDING, createdAt: { gte: start } },
            }),
            this.prisma.paymentRetry.count({ where: { status: "PENDING" } }),
            this.prisma.dailyActive.count({
                where: { dateKey: start.toISOString().slice(0, 10) },
            }),
        ]);
        return {
            date: start.toISOString().slice(0, 10),
            paidOrders,
            failedOrders,
            pendingOrders,
            retryPending,
            dau,
        };
    }
};
exports.AdminMetricsController = AdminMetricsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminMetricsController.prototype, "getMetrics", null);
exports.AdminMetricsController = AdminMetricsController = __decorate([
    (0, common_1.Controller)("admin/metrics"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminMetricsController);
