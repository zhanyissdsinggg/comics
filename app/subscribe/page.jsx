import { Suspense } from "react";
import SubscribePage from "../../components/subscribe/SubscribePage";
import Skeleton from "../../components/common/Skeleton";

export const metadata = {
  title: "Subscribe",
  description: "Choose a subscription plan.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950">
          <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
            <Skeleton className="h-10 w-40 rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-3xl" />
          </div>
        </div>
      }
    >
      <SubscribePage />
    </Suspense>
  );
}
