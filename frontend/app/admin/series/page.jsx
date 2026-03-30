'use client';

export const dynamic = 'force-dynamic';

import AdminShell from '@/components/admin/AdminShell';
import AdminSeriesPageNew from '@/components/admin/AdminSeriesPageNew';

export default function AdminSeriesPage() {
  return (
    <AdminShell
      title="Series"
      subtitle="Manage titles, publishing status, creator credit readiness, and the basic story metadata readers rely on."
    >
      <AdminSeriesPageNew />
    </AdminShell>
  );
}
