"use client";

import AdminShell from "./AdminShell";

/**
 * Legacy admin pages still render through AdminLayout, but the shared AdminShell
 * now owns the product-family shell, spacing, and navigation language.
 */
export function AdminLayout({ children, title = "Dashboard", subtitle, actions }) {
  return (
    <AdminShell title={title} subtitle={subtitle} actions={actions}>
      {children}
    </AdminShell>
  );
}
