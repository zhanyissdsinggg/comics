"use client";

export const dynamic = 'force-dynamic';


import { Suspense } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import AdminEmailJobsPage from "../../../components/admin/AdminEmailJobsPage";

export default function EmailJobsPage() {
  return (
    <AdminLayout title="邮件任务">
      <Suspense fallback={<div>Loading...</div>}>
        <AdminEmailJobsPage />
      </Suspense>
    </AdminLayout>
  );
}
