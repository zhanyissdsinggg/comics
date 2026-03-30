"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import Skeleton from "../../../components/common/Skeleton";
import TrackingSettings from "../../../components/tracking/TrackingSettings";

export default function AdminTrackingPage() {
  return (
    <AdminLayout
      title="跟踪设置"
      subtitle="把追踪脚本、平台令牌和本地草稿同步收在一个安静页面里，不把后台做成吵闹的分析面板。"
    >
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 w-56 rounded-[20px]" />
            <Skeleton className="h-40 w-full rounded-[28px]" />
            <Skeleton className="h-96 w-full rounded-[28px]" />
          </div>
        }
      >
        <TrackingSettings />
      </Suspense>
    </AdminLayout>
  );
}
