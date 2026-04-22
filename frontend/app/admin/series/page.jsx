"use client";

export const dynamic = "force-dynamic";

import AdminShell from "@/components/admin/AdminShell";
import AdminSeriesPageNew from "@/components/admin/AdminSeriesPageNew";

export default function AdminSeriesPage() {
  return (
    <AdminShell
      title="作品"
      subtitle="集中处理作品信息、发布状态、署名完整度和上架准备情况。"
    >
      <AdminSeriesPageNew />
    </AdminShell>
  );
}
