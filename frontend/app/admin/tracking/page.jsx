"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import Skeleton from "../../../components/common/Skeleton";
import TrackingSettings from "../../../components/tracking/TrackingSettings";

export default function AdminTrackingPage() {
  return (
    <AdminLayout
      title="追踪设置"
      subtitle="管理站点追踪脚本与广告平台配置。"
    >
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 w-56 rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-96 w-full rounded-3xl" />
          </div>
        }
      >
        <TrackingSettings />
      </Suspense>
    </AdminLayout>
  );
}
