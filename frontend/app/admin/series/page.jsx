"use client";

export const dynamic = "force-dynamic";

import AdminShell from "@/components/admin/AdminShell";
import AdminSeriesPageNew from "@/components/admin/AdminSeriesPageNew";

export default function AdminSeriesPage() {
  return (
    <AdminShell
      title="作品"
      subtitle="集中处理作品信息、发布状态和创作者署名准备度，让后台先把作品本身管清楚。"
    >
      <AdminSeriesPageNew />
    </AdminShell>
  );
}
