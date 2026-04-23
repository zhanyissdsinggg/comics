"use client";

import { AdminAuthProvider } from "../../components/admin/AuthContext";
import AdminRouteGuard from "../../components/admin/AdminRouteGuard";
import { QueryWrapper } from "./QueryWrapper";

export default function AdminLayoutClient({ children }) {
  return (
    <AdminAuthProvider>
      <QueryWrapper>
        <AdminRouteGuard>
          <div className="admin-theme min-h-screen bg-[var(--gush-page-bg)] text-[var(--gush-ink-strong)]">
            {children}
          </div>
        </AdminRouteGuard>
      </QueryWrapper>
    </AdminAuthProvider>
  );
}
