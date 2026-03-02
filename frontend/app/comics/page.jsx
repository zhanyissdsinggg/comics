import { Suspense } from "react";
import ComicsPage from "../../components/comics/ComicsPage";
import Skeleton from "../../components/common/Skeleton";
import ErrorBoundary from "../../components/common/ErrorBoundary";

export const metadata = {
  title: "Comics - Browse All Series",
  description: "Discover trending comics, manga, and webtoons. Browse by genre and find your next favorite series.",
  // 老王添加：Open Graph标签
  openGraph: {
    title: "Comics - Browse All Series | Gush Comics",
    description: "Discover trending comics, manga, and webtoons. Browse by genre and find your next favorite series.",
    url: "https://gushcomics.com/comics",
    siteName: "Gush Comics",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Comics - Browse All Series | Gush Comics",
    description: "Discover trending comics, manga, and webtoons. Browse by genre and find your next favorite series.",
  },
};

export default function Page() {
  return (
    <ErrorBoundary
      title="Failed to load comics page"
      message="We couldn't load the comics page. Please try again."
    >
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950">
            <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
              <Skeleton className="h-48 w-full rounded-3xl" />
              <Skeleton className="h-10 w-64 rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-3xl" />
            </div>
          </div>
        }
      >
        <ComicsPage />
      </Suspense>
    </ErrorBoundary>
  );
}
