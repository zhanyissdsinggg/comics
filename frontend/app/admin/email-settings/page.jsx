'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import AdminEmailSettingsPage from '../../../components/admin/AdminEmailSettingsPage';

export default function EmailSettingsPage() {
  return (
    <AdminLayout title="Email Settings">
      <Suspense fallback={<div>Loading...</div>}>
        <AdminEmailSettingsPage />
      </Suspense>
    </AdminLayout>
  );
}
