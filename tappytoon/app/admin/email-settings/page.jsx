"use client";

import { Suspense } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import AdminEmailSettingsPage from "../../../components/admin/AdminEmailSettingsPage";

export default function EmailSettingsPage() {
  return (
    <AdminLayout title="邮件配置">
      <Suspense fallback={<div>Loading...</div>}>
        <AdminEmailSettingsPage />
      </Suspense>
    </AdminLayout>
  );
}
