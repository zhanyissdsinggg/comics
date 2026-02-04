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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let CommentsService = class CommentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(seriesId, userId) {
        const comments = await this.prisma.comment.findMany({
            where: { seriesId, hidden: false },
            orderBy: { createdAt: "desc" },
            include: {
                likes: { select: { userId: true } },
                replies: {
                    orderBy: { createdAt: "asc" },
                    include: { user: { select: { email: true } } },
                },
                user: { select: { email: true } },
            },
        });
        return comments.map((comment) => this.decorate(comment, userId));
    }
    async add(seriesId, userId, text) {
        const comment = await this.prisma.comment.create({
            data: { seriesId, userId, text },
            include: { likes: { select: { userId: true } }, replies: true, user: { select: { email: true } } },
        });
        return this.decorate(comment, userId);
    }
    async like(_seriesId, commentId, userId) {
        const existing = await this.prisma.commentLike.findUnique({
            where: { commentId_userId: { commentId, userId } },
        });
        if (existing) {
            await this.prisma.commentLike.delete({ where: { id: existing.id } });
        }
        else {
            await this.prisma.commentLike.create({ data: { commentId, userId } });
        }
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                likes: { select: { userId: true } },
                replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { email: true } } } },
                user: { select: { email: true } },
            },
        });
        if (!comment) {
            return null;
        }
        return this.decorate(comment, userId);
    }
    async reply(_seriesId, commentId, userId, text) {
        const exists = await this.prisma.comment.findUnique({ where: { id: commentId } });
        if (!exists) {
            return null;
        }
        await this.prisma.commentReply.create({ data: { commentId, userId, text } });
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                likes: { select: { userId: true } },
                replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { email: true } } } },
                user: { select: { email: true } },
            },
        });
        if (!comment) {
            return null;
        }
        return this.decorate(comment, userId);
    }
    decorate(comment, userId) {
        var _a;
        const likes = Array.isArray(comment.likes) ? comment.likes : [];
        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        return {
            id: comment.id,
            seriesId: comment.seriesId,
            userId: comment.userId,
            author: ((_a = comment.user) === null || _a === void 0 ? void 0 : _a.email) || "Guest",
            text: comment.text,
            createdAt: comment.createdAt,
            likes: likes.map((like) => like.userId),
            replies: replies.map((reply) => {
                var _a;
                return ({
                    id: reply.id,
                    userId: reply.userId,
                    author: ((_a = reply.user) === null || _a === void 0 ? void 0 : _a.email) || "Guest",
                    text: reply.text,
                    createdAt: reply.createdAt,
                });
            }),
            likeCount: likes.length,
            likedByUser: likes.some((like) => like.userId === userId),
        };
    }
};
exports.CommentsService = CommentsService;
exports.CommentsService = CommentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CommentsService);
