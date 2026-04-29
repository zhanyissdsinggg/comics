import { Suspense } from "react";
import AdultGatePage from "../../components/adult/AdultGatePage";
import Skeleton from "../../components/common/Skeleton";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "18+ Access",
  description: "Sign in for 18+ titles.",
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
        <div className="min-h-screen overflow-hidden bg-black text-white">
          <div className="mx-auto max-w-2xl space-y-4 px-4 py-16">
            <Skeleton className="h-10 w-48 rounded-2xl bg-[#111111]" />
            <Skeleton className="h-40 w-full rounded-[32px] border-2 border-white/20 bg-[#111111] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" />
          </div>
        </div>
      }
    >
      <AdultGatePage />
    </Suspense>
  );
}
