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
exports.ReadingController = void 0;
const common_1 = require("@nestjs/common");
const auth_1 = require("../../common/utils/auth");
const errors_1 = require("../../common/utils/errors");
const reading_service_1 = require("./reading.service");
let ReadingController = class ReadingController {
    constructor(readingService) {
        this.readingService = readingService;
    }
    async getBookmarks(req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        return { bookmarks: await this.readingService.getBookmarks(userId) };
    }
    async addBookmark(body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const seriesId = body === null || body === void 0 ? void 0 : body.seriesId;
        const entry = (body === null || body === void 0 ? void 0 : body.bookmark) || (body === null || body === void 0 ? void 0 : body.entry) || {};
        if (!seriesId || !(entry === null || entry === void 0 ? void 0 : entry.episodeId)) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        return { bookmarks: await this.readingService.addBookmark(userId, seriesId, entry) };
    }
    async removeBookmark(body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const seriesId = body === null || body === void 0 ? void 0 : body.seriesId;
        const bookmarkId = body === null || body === void 0 ? void 0 : body.bookmarkId;
        if (!seriesId || !bookmarkId) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        return { bookmarks: await this.readingService.removeBookmark(userId, seriesId, bookmarkId) };
    }
    async getHistory(req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        return { history: await this.readingService.getHistory(userId) };
    }
    async addHistory(body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        if (!(body === null || body === void 0 ? void 0 : body.seriesId) || !(body === null || body === void 0 ? void 0 : body.episodeId)) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        return { history: await this.readingService.addHistory(userId, body) };
    }
};
exports.ReadingController = ReadingController;
__decorate([
    (0, common_1.Get)("bookmarks"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "getBookmarks", null);
__decorate([
    (0, common_1.Post)("bookmarks"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "addBookmark", null);
__decorate([
    (0, common_1.Delete)("bookmarks"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "removeBookmark", null);
__decorate([
    (0, common_1.Get)("history"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)("history"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "addHistory", null);
exports.ReadingController = ReadingController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [reading_service_1.ReadingService])
], ReadingController);
