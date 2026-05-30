"use client";

import AdminShell from "./AdminShell";

/**
 * Legacy admin routes still render through AdminLayout, but the shared
 * AdminShell owns the chrome, spacing, and navigation language.
 */
export function AdminLayout({
  children,
  title = "Dashboard",
  subtitle,
  actions,
}) {
  return (
    <AdminShell title={title} subtitle={subtitle} actions={actions}>
      {children}
    </AdminShell>
  );
}
