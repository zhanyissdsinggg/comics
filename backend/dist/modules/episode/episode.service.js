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
exports.EpisodeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let EpisodeService = class EpisodeService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getEpisode(seriesId, episodeId) {
        const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
        if (!series) {
            return null;
        }
        const stored = await this.prisma.episode.findUnique({ where: { id: episodeId } });
        const hasPages = Array.isArray(stored === null || stored === void 0 ? void 0 : stored.pages) && stored.pages.length > 0;
        const hasParagraphs = Array.isArray(stored === null || stored === void 0 ? void 0 : stored.paragraphs) && stored.paragraphs.length > 0;
        if (hasPages || hasParagraphs || (stored === null || stored === void 0 ? void 0 : stored.text)) {
            if (series.type === "novel") {
                const paragraphs = (Array.isArray(stored.paragraphs) ? stored.paragraphs : stored.paragraphs || []) ||
                    String(stored.text || "")
                        .split(/\r?\n/)
                        .map((line) => line.trim())
                        .filter(Boolean);
                return {
                    episode: {
                        id: stored.id,
                        seriesId,
                        number: stored.number,
                        title: stored.title,
                        type: "novel",
                        paragraphs,
                        previewParagraphs: 3,
                    },
                };
            }
            return {
                episode: {
                    id: stored.id,
                    seriesId,
                    number: stored.number,
                    title: stored.title,
                    type: "comic",
                    pages: Array.isArray(stored.pages) ? stored.pages : stored.pages || [],
                },
            };
        }
        const number = Number(episodeId.replace(`${seriesId}e`, "")) || 1;
        if (series.type === "novel") {
            return {
                episode: {
                    id: episodeId,
                    seriesId,
                    number,
                    title: `Episode ${number}`,
                    type: "novel",
                    paragraphs: Array.from({ length: 16 }, (_, idx) => `(${seriesId}-${episodeId}) Paragraph ${idx + 1}. Lorem ipsum dolor sit amet.`),
                    previewParagraphs: 3,
                },
            };
        }
        return {
            episode: {
                id: episodeId,
                seriesId,
                number,
                title: `Episode ${number}`,
                type: "comic",
                pages: Array.from({ length: 18 }, (_, idx) => ({
                    url: `https://placehold.co/800x1200?text=${seriesId}-${episodeId}-P${idx + 1}`,
                    w: 800,
                    h: 1200,
                })),
            },
        };
    }
};
exports.EpisodeService = EpisodeService;
exports.EpisodeService = EpisodeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EpisodeService);
