import { Suspense } from "react";
import HomePage from "../components/home/HomePage";
import Skeleton from "../components/common/Skeleton";
import ErrorBoundary from "../components/common/ErrorBoundary";

export const metadata = {
  title: "Read Comics & Novels Online",
  description: "Discover thousands of comics and novels. Read your favorite series online with high-quality translations. New episodes updated daily.",
  // 老王添加：Open Graph标签，让社交分享更漂亮
  openGraph: {
    title: "Gush Comics - Read Comics & Novels Online",
    description: "Discover thousands of comics and novels. Read your favorite series online with high-quality translations. New episodes updated daily.",
    url: "https://gushcomics.com",
    siteName: "Gush Comics",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.jpg", // 老王注释：需要在public目录添加这个图片
        width: 1200,
        height: 630,
        alt: "Gush Comics - Read Comics & Novels Online",
      },
    ],
  },
  // 老王添加：Twitter Card标签
  twitter: {
    card: "summary_large_image",
    title: "Gush Comics - Read Comics & Novels Online",
    description: "Discover thousands of comics and novels. Read your favorite series online with high-quality translations.",
    images: ["/og-image.jpg"],
  },
};

// 老王说：删除reportWebVitals导出，服务器组件不能导出客户端模块的内容

export default function Page() {
  return (
    <ErrorBoundary
      title="Failed to load home page"
      message="We couldn't load the home page. Please try again."
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
        <HomePage />
      </Suspense>
    </ErrorBoundary>
  );
}
