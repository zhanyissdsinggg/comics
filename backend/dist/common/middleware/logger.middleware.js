"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerMiddleware = loggerMiddleware;
function loggerMiddleware(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        const requestId = req.requestId || "";
        const status = res.statusCode;
        const line = `[api] ${req.method} ${req.originalUrl} ${status} ${duration}ms ${requestId}`.trim();
        if (status >= 500) {
            console.error(line);
        }
        else if (status >= 400) {
            console.warn(line);
        }
        else {
            console.log(line);
        }
    });
    next();
}
