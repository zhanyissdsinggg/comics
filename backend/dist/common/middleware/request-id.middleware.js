"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const request_id_1 = require("../utils/request-id");
function requestIdMiddleware(req, res, next) {
    const existing = req.headers["x-request-id"];
    const requestId = Array.isArray(existing) ? existing[0] : existing || (0, request_id_1.createRequestId)();
    req.requestId = String(requestId);
    res.setHeader("x-request-id", req.requestId);
    next();
}
