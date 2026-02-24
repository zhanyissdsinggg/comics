import { Suspense } from "react";
import AdminEpisodesPage from "../../../../../components/admin/AdminEpisodesPage";
import Skeleton from "../../../../../components/common/Skeleton";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950">
          <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
            <Skeleton className="h-10 w-48 rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        </div>
      }
    >
      <AdminEpisodesPage />
    </Suspense>
  );
}
