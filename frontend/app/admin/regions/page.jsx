'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import AdminRegionsPage from '../../../components/admin/AdminRegionsPage';

export default function RegionsPage() {
  return (
    <AdminLayout title="Regions">
      <Suspense fallback={<div>Loading...</div>}>
        <AdminRegionsPage />
      </Suspense>
    </AdminLayout>
  );
}
