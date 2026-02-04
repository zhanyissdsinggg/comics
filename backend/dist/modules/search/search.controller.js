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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const search_service_1 = require("./search.service");
const adult_gate_1 = require("../../common/utils/adult-gate");
const errors_1 = require("../../common/utils/errors");
const auth_1 = require("../../common/utils/auth");
let SearchController = class SearchController {
    constructor(searchService) {
        this.searchService = searchService;
    }
    async search(q, adultParam, req, res) {
        const adult = (0, adult_gate_1.parseBool)(adultParam);
        if (adult === true) {
            const gate = (0, adult_gate_1.checkAdultGate)(req.cookies || {});
            if (!gate.ok) {
                res.status(403);
                return (0, errors_1.buildError)(errors_1.ERROR_CODES.ADULT_GATED, { reason: gate.reason });
            }
        }
        const results = await this.searchService.search(q || "", adult === true);
        return { results };
    }
    async keywords(adultParam, req, res) {
        const adult = (0, adult_gate_1.parseBool)(adultParam);
        if (adult === true) {
            const gate = (0, adult_gate_1.checkAdultGate)(req.cookies || {});
            if (!gate.ok) {
                res.status(403);
                return (0, errors_1.buildError)(errors_1.ERROR_CODES.ADULT_GATED, { reason: gate.reason });
            }
        }
        const keywords = await this.searchService.keywords(adult === true);
        return { keywords };
    }
    async suggest(q, adultParam, req, res) {
        const adult = (0, adult_gate_1.parseBool)(adultParam);
        if (adult === true) {
            const gate = (0, adult_gate_1.checkAdultGate)(req.cookies || {});
            if (!gate.ok) {
                res.status(403);
                return (0, errors_1.buildError)(errors_1.ERROR_CODES.ADULT_GATED, { reason: gate.reason });
            }
        }
        const suggestions = await this.searchService.suggest(q || "", adult === true);
        return { suggestions };
    }
    async hot(adultParam, windowParam, req, res) {
        const adult = (0, adult_gate_1.parseBool)(adultParam);
        if (adult === true) {
            const gate = (0, adult_gate_1.checkAdultGate)(req.cookies || {});
            if (!gate.ok) {
                res.status(403);
                return (0, errors_1.buildError)(errors_1.ERROR_CODES.ADULT_GATED, { reason: gate.reason });
            }
        }
        const keywords = await this.searchService.hot(adult === true, windowParam);
        return { keywords };
    }
    async log(body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const query = body === null || body === void 0 ? void 0 : body.query;
        if (!query) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        await this.searchService.log(userId, query);
        return { ok: true };
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("q")),
    __param(1, (0, common_1.Query)("adult")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "search", null);
__decorate([
    (0, common_1.Get)("keywords"),
    __param(0, (0, common_1.Query)("adult")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "keywords", null);
__decorate([
    (0, common_1.Get)("suggest"),
    __param(0, (0, common_1.Query)("q")),
    __param(1, (0, common_1.Query)("adult")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "suggest", null);
__decorate([
    (0, common_1.Get)("hot"),
    __param(0, (0, common_1.Query)("adult")),
    __param(1, (0, common_1.Query)("window")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "hot", null);
__decorate([
    (0, common_1.Post)("log"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "log", null);
exports.SearchController = SearchController = __decorate([
    (0, common_1.Controller)("search"),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], SearchController);
