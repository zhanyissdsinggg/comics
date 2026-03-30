'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import AdminEmailJobsPage from '../../../components/admin/AdminEmailJobsPage';

export default function EmailJobsPage() {
  return (
    <AdminLayout
      title="Email Jobs"
      subtitle="Review queued sends, delivery history, and the operational state of outbound email."
    >
      <Suspense fallback={<div className="text-sm text-slate-500">Loading email jobs...</div>}>
        <AdminEmailJobsPage />
      </Suspense>
    </AdminLayout>
  );
}
