export const dynamic = 'force-dynamic';

"use client";

import { Suspense } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import AdminBrandingPage from "../../../components/admin/AdminBrandingPage";

export default function BrandingPage() {
  return (
    <AdminLayout title="品牌管理">
      <Suspense fallback={<div>Loading...</div>}>
        <AdminBrandingPage />
      </Suspense>
    </AdminLayout>
  );
}
