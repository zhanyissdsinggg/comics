import { Suspense } from "react";
import SubscribePage from "../../components/subscribe/SubscribePage";
import Skeleton from "../../components/common/Skeleton";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Subscribe",
  description: "Compare membership plans, discounts, and daily perks before you subscribe.",
  path: "/subscribe",
});

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f6fb]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
          <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
            <Skeleton className="h-10 w-40 rounded-2xl bg-slate-200" />
            <Skeleton className="h-48 w-full rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]" />
          </div>
        </div>
      }
    >
      <SubscribePage />
    </Suspense>
  );
}
