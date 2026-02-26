import { Suspense } from "react";
import AdultGatePage from "../../components/adult/AdultGatePage";
import Skeleton from "../../components/common/Skeleton";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950">
          <div className="mx-auto max-w-2xl px-4 py-16 space-y-4">
            <Skeleton className="h-10 w-48 rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </div>
        </div>
      }
    >
      <AdultGatePage />
    </Suspense>
  );
}
