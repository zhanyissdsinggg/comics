import { Suspense } from "react";
import AdultGatePage from "../../components/adult/AdultGatePage";
import Skeleton from "../../components/common/Skeleton";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "18+ Access Check",
  description: "Sign in and confirm your age to access mature content on Gush.",
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
        <div className="min-h-screen overflow-hidden bg-black text-black">
          <div className="mx-auto max-w-2xl space-y-4 px-4 py-16">
            <Skeleton className="h-10 w-48 rounded-2xl bg-slate-200" />
            <Skeleton className="h-40 w-full rounded-3xl border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]" />
          </div>
        </div>
      }
    >
      <AdultGatePage />
    </Suspense>
  );
}
