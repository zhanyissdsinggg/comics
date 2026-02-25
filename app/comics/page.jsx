import { Suspense } from "react";
import ComicsPage from "../../components/comics/ComicsPage";
import Skeleton from "../../components/common/Skeleton";
import ErrorBoundary from "../../components/common/ErrorBoundary";

export const metadata = {
  title: "Comics",
  description: "Discover trending comics and manga.",
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
