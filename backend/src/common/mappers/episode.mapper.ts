import { Injectable } from "@nestjs/common";

function normalizeParagraphs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

@Injectable()
export class EpisodeMapper {
  toNovelEpisodeView(episode: any, seriesId: string): any {
    return {
      episode: {
        id: episode.id,
        seriesId,
        number: episode.number,
        title: episode.title,
        type: "novel",
        paragraphs: normalizeParagraphs(episode.paragraphs ?? episode.text),
        previewParagraphs: 3,
      },
    };
  }

  toComicEpisodeView(episode: any, seriesId: string): any {
    return {
      episode: {
        id: episode.id,
        seriesId,
        number: episode.number,
        title: episode.title,
        type: "comic",
        pages: Array.isArray(episode.pages) ? episode.pages : [],
      },
    };
  }
}
