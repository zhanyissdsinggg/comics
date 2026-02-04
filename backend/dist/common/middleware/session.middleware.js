"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSessionMiddleware = createSessionMiddleware;
function createSessionMiddleware(prisma) {
    return async function sessionMiddleware(req, _res, next) {
        var _a, _b, _c;
        const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.mn_session;
        if (!token) {
            next();
            return;
        }
        try {
            const session = await prisma.session.findUnique({
                where: { token },
                include: { user: true },
            });
            if (session && !((_b = session.user) === null || _b === void 0 ? void 0 : _b.isBlocked)) {
                req.userId = session.userId;
                req.userEmail = ((_c = session.user) === null || _c === void 0 ? void 0 : _c.email) || "";
            }
        }
        catch {
        }
        next();
    };
}
