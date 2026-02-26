import SeriesPage from "../../../components/series/SeriesPage";

export default async function SeriesRoutePage({ params }) {
  return <SeriesPage seriesId={params.id} />;
}
