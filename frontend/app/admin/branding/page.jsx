'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import AdminBrandingPage from '../../../components/admin/AdminBrandingPage';

export default function BrandingPage() {
  return (
    <AdminLayout
      title="Branding"
      subtitle="Adjust the shared product assets, logos, and artwork that shape the reader-facing brand."
    >
      <Suspense fallback={<div className="text-sm text-slate-500">Loading branding settings...</div>}>
        <AdminBrandingPage />
      </Suspense>
    </AdminLayout>
  );
}
