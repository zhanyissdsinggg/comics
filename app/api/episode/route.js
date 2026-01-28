import { NextResponse } from "next/server";
import { SERIES_CATALOG } from "../../../lib/seriesCatalog";
import { getEpisodeById } from "../../../lib/serverStore";

function buildComicPages(seriesId, episodeId, count = 12) {
  return Array.from({ length: count }, (_, index) => ({
    url: `https://placehold.co/800x1200?text=${seriesId}-${episodeId}-P${index + 1}`,
    w: 800,
    h: 1200,
  }));
}

function buildNovelText(seriesId, episodeId, count = 12) {
  return Array.from({ length: count }, (_, index) =>
    `(${seriesId}-${episodeId}) Paragraph ${index + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`
  );
}

export async function GET(request) {
  const seriesId = request.nextUrl.searchParams.get("seriesId");
  const episodeId = request.nextUrl.searchParams.get("episodeId");
  if (!seriesId || !episodeId) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const series = SERIES_CATALOG.find((item) => item.id === seriesId);
  const episodeMeta = getEpisodeById(seriesId, episodeId);

  if (!series || !episodeMeta) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (series.type === "novel") {
    return NextResponse.json({
      episode: {
        ...episodeMeta,
        type: "novel",
        paragraphs: buildNovelText(seriesId, episodeId, 16),
        previewParagraphs: Math.max(3, episodeMeta.previewFreePages || 3),
      },
    });
  }

  return NextResponse.json({
    episode: {
      ...episodeMeta,
      type: "comic",
      pages: buildComicPages(seriesId, episodeId, 18),
    },
  });
}
