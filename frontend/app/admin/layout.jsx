'use client';

import { AdminAuthProvider } from '../../components/admin/AuthContext';
import AdminLocaleBridge from '../../components/admin/AdminLocaleBridge';
import AdminRouteGuard from '../../components/admin/AdminRouteGuard';
import { QueryWrapper } from './QueryWrapper';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }) {
  return (
    <AdminAuthProvider>
      <QueryWrapper>
        <AdminRouteGuard>
          <div className="admin-theme min-h-screen bg-[var(--gush-page-bg)] text-[var(--gush-ink-strong)]">
            {/* Temporary compatibility layer while a few low-frequency admin pages are still source-cleaned. */}
            <AdminLocaleBridge />
            {children}
          </div>
        </AdminRouteGuard>
      </QueryWrapper>
    </AdminAuthProvider>
  );
}
