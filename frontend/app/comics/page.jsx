import { Suspense } from "react";
import ComicsPage from "../../components/comics/ComicsPage";
import Skeleton from "../../components/common/Skeleton";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Comics - Browse All Series",
  description:
    "Discover trending comics, manga, and webtoons. Browse by genre and find your next favorite series.",
  path: "/comics",
});

export default function Page() {
  return (
    <ErrorBoundary
      title="Failed to load comics page"
      message="We couldn't load the comics page. Please try again."
    >
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950">
            <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
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
