import { Suspense } from "react";
import AdultGatePage from "../../components/adult/AdultGatePage";
import Skeleton from "../../components/common/Skeleton";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "18+ Access",
  description: "Sign in and confirm your age for 18+ titles on Gush.",
  path: "/adult-gate",
  robots: {
    index: false,
    follow: false,
  },
});

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
          <div className="mx-auto max-w-2xl space-y-4 px-4 py-16">
            <Skeleton className="h-10 w-48 rounded-2xl bg-slate-200" />
            <Skeleton className="h-40 w-full rounded-[32px] border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]" />
          </div>
        </div>
      }
    >
      <AdultGatePage />
    </Suspense>
  );
}
