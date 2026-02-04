"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminKeyMiddleware = void 0;
const common_1 = require("@nestjs/common");
const admin_1 = require("../../common/utils/admin");
let AdminKeyMiddleware = class AdminKeyMiddleware {
    use(req, res, next) {
        if ((0, admin_1.isAdminAuthorized)(req, req.body)) {
            next();
            return;
        }
        res.status(403).json({ error: "FORBIDDEN" });
    }
};
exports.AdminKeyMiddleware = AdminKeyMiddleware;
exports.AdminKeyMiddleware = AdminKeyMiddleware = __decorate([
    (0, common_1.Injectable)()
], AdminKeyMiddleware);
