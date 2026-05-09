"use client";

import FigmaReaderPage from "../../../../components/figma/FigmaReaderPage";

export default function ReaderPageShell({ seriesId, episodeId }) {
  return <FigmaReaderPage seriesId={seriesId} episodeId={episodeId} />;
}
