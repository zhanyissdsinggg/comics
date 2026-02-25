"use client";

import { Suspense } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import TrackingSettings from "../../../components/tracking/TrackingSettings";
import Skeleton from "../../../components/common/Skeleton";

function TrackingContent() {
  return <TrackingSettings />;
}

export default function Page() {
  return (
    <AdminLayout title="追踪设置" subtitle="管理埋点与追踪平台配置。">
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950">
            <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
              <Skeleton className="h-10 w-56 rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-3xl" />
              <Skeleton className="h-64 w-full rounded-3xl" />
            </div>
          </div>
        }
      >
        <TrackingContent />
      </Suspense>
    </AdminLayout>
  );
}
