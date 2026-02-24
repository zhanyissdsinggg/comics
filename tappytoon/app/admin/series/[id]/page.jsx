"use client";

import { Suspense } from "react";
import { AdminLayout } from "../../../../components/admin/AdminLayout";
import AdminSeriesEditPage from "../../../../components/admin/AdminSeriesEditPage";
import Skeleton from "../../../../components/common/Skeleton";

export default function Page() {
  return (
    <AdminLayout title="作品编辑">
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950">
            <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
              <Skeleton className="h-10 w-48 rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-3xl" />
              <Skeleton className="h-32 w-full rounded-3xl" />
            </div>
          </div>
        }
      >
        <AdminSeriesEditPage />
      </Suspense>
    </AdminLayout>
  );
}
