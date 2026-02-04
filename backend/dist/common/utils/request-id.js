"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestId = createRequestId;
function createRequestId() {
    return `req_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}
