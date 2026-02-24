"use client";

import { Suspense } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import AdminRegionsPage from "../../../components/admin/AdminRegionsPage";

export default function RegionsPage() {
  return (
    <AdminLayout title="地区管理">
      <Suspense fallback={<div>Loading...</div>}>
        <AdminRegionsPage />
      </Suspense>
    </AdminLayout>
  );
}
