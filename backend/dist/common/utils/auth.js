"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserIdFromRequest = getUserIdFromRequest;
function getUserIdFromRequest(req, allowGuest = true) {
    const direct = req.userId;
    if (direct) {
        return direct;
    }
    if (allowGuest) {
        return "guest";
    }
    return null;
}
