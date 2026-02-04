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
exports.AdminEmailJobsController = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
const errors_1 = require("../../common/utils/errors");
const mock_store_1 = require("../../common/storage/mock-store");
const email_service_1 = require("../email/email.service");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AdminEmailJobsController = class AdminEmailJobsController {
    constructor(emailService, prisma) {
        this.emailService = emailService;
        this.prisma = prisma;
    }
    async list(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        return { jobs: (0, mock_store_1.listEmailJobs)(100) };
    }
    async failed(req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        return { jobs: (0, mock_store_1.listFailedEmailJobs)(100) };
    }
    async retry(body, req, res) {
        if (!(0, admin_1.isAdminAuthorized)(req, body)) {
            res.status(403);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.FORBIDDEN);
        }
        const jobId = body === null || body === void 0 ? void 0 : body.jobId;
        if (!jobId) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const result = await this.emailService.retryJobById(String(jobId));
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: req.userId || null,
                    action: "admin_email_retry",
                    targetType: "email_job",
                    targetId: String(jobId),
                    payload: { ok: result.ok },
                    requestId: req.requestId || "",
                },
            });
        }
        catch {
        }
        if (!result.ok) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INTERNAL);
        }
        return { ok: true };
    }
};
exports.AdminEmailJobsController = AdminEmailJobsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEmailJobsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("failed"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEmailJobsController.prototype, "failed", null);
__decorate([
    (0, common_1.Post)("retry"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEmailJobsController.prototype, "retry", null);
exports.AdminEmailJobsController = AdminEmailJobsController = __decorate([
    (0, common_1.Controller)("admin/email/jobs"),
    __metadata("design:paramtypes", [email_service_1.EmailService,
        prisma_service_1.PrismaService])
], AdminEmailJobsController);
