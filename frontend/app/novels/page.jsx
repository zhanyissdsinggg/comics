import { Suspense } from "react";
import NovelsPage from "../../components/novels/NovelsPage";
import Skeleton from "../../components/common/Skeleton";
import ErrorBoundary from "../../components/common/ErrorBoundary";

export const metadata = {
  title: "Novels - Browse All Series",
  description: "Discover trending web novels and light novels. Browse by genre and find your next favorite story.",
  // 老王添加：Open Graph标签
  openGraph: {
    title: "Novels - Browse All Series | Gush Comics",
    description: "Discover trending web novels and light novels. Browse by genre and find your next favorite story.",
    url: "https://gushcomics.com/novels",
    siteName: "Gush Comics",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Novels - Browse All Series | Gush Comics",
    description: "Discover trending web novels and light novels. Browse by genre and find your next favorite story.",
  },
};

export default function Page() {
  return (
    <ErrorBoundary
      title="Failed to load novels page"
      message="We couldn't load the novels page. Please try again."
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
        <NovelsPage />
      </Suspense>
    </ErrorBoundary>
  );
}
