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
exports.EventsController = void 0;
const common_1 = require("@nestjs/common");
const events_service_1 = require("./events.service");
const auth_1 = require("../../common/utils/auth");
const errors_1 = require("../../common/utils/errors");
let EventsController = class EventsController {
    constructor(eventsService) {
        this.eventsService = eventsService;
    }
    list(eventName, limitParam, offsetParam, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        const events = this.eventsService.list(userId);
        const filtered = eventName
            ? events.filter((item) => String(item.event || "") === String(eventName))
            : events;
        const limit = Math.max(1, Math.min(100, Number(limitParam || 50)));
        const offset = Math.max(0, Number(offsetParam || 0));
        const sliced = filtered.slice(offset, offset + limit);
        const counts = {};
        filtered.forEach((item) => {
            const key = String(item.event || "unknown");
            counts[key] = (counts[key] || 0) + 1;
        });
        return { events: sliced, total: filtered.length, limit, offset, counts };
    }
    add(body, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        if (!(body === null || body === void 0 ? void 0 : body.event)) {
            res.status(400);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.INVALID_REQUEST);
        }
        const next = this.eventsService.add(userId, {
            event: body.event,
            props: body.props || {},
            ts: body.ts || Date.now(),
        });
        return { events: next };
    }
    export(eventName, req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401).json((0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED));
            return;
        }
        const events = this.eventsService.list(userId);
        const filtered = eventName
            ? events.filter((item) => String(item.event || "") === String(eventName))
            : events;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=event-log.json");
        res.status(200).send(JSON.stringify(filtered, null, 2));
    }
    clear(req, res) {
        const userId = (0, auth_1.getUserIdFromRequest)(req, false);
        if (!userId) {
            res.status(401);
            return (0, errors_1.buildError)(errors_1.ERROR_CODES.UNAUTHENTICATED);
        }
        return { events: this.eventsService.clear(userId) };
    }
};
exports.EventsController = EventsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("event")),
    __param(1, (0, common_1.Query)("limit")),
    __param(2, (0, common_1.Query)("offset")),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "add", null);
__decorate([
    (0, common_1.Get)("export"),
    __param(0, (0, common_1.Query)("event")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "export", null);
__decorate([
    (0, common_1.Delete)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "clear", null);
exports.EventsController = EventsController = __decorate([
    (0, common_1.Controller)("events"),
    __metadata("design:paramtypes", [events_service_1.EventsService])
], EventsController);
