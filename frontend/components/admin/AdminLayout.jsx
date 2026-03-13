"use client";

import AdminShell from "./AdminShell";

/**
 * Backward-compatible admin layout wrapper.
 * Legacy pages still render through AdminLayout, but the shared AdminShell owns the UI.
 */
export function AdminLayout({ children, title = "仪表盘", subtitle, actions }) {
  return (
    <AdminShell title={title} subtitle={subtitle} actions={actions}>
      {children}
    </AdminShell>
  );
}
