import SeriesPage from "../../../components/series/SeriesPage";

// 老王说：启用 ISR，每 5 分钟重新生成页面
export const revalidate = 300;

export default async function SeriesRoutePage({ params }) {
  return <SeriesPage seriesId={params.id} />;
}
