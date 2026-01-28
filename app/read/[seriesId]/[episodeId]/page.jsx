import ReaderPage from "../../../../components/reader/ReaderPage";

export default function Page({ params }) {
  return <ReaderPage seriesId={params.seriesId} episodeId={params.episodeId} />;
}
