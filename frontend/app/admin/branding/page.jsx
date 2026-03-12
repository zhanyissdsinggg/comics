'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import AdminBrandingPage from '../../../components/admin/AdminBrandingPage';

export default function BrandingPage() {
  return (
    <AdminLayout title="Brand Settings">
      <Suspense fallback={<div>Loading...</div>}>
        <AdminBrandingPage />
      </Suspense>
    </AdminLayout>
  );
}
