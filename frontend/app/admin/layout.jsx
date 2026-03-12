'use client';

import { AdminAuthProvider } from '../../components/admin/AuthContext';
import AdminRouteGuard from '../../components/admin/AdminRouteGuard';
import { QueryWrapper } from './QueryWrapper';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }) {
  return (
    <AdminAuthProvider>
      <QueryWrapper>
        <AdminRouteGuard>{children}</AdminRouteGuard>
      </QueryWrapper>
    </AdminAuthProvider>
  );
}
