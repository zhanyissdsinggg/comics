'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import AdminBrandingPage from '../../../components/admin/AdminBrandingPage';

export default function BrandingPage() {
  return (
    <AdminLayout title="品牌设置">
      <Suspense fallback={<div>加载中...</div>}>
        <AdminBrandingPage />
      </Suspense>
    </AdminLayout>
  );
}
