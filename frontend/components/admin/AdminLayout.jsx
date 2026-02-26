"use client";

import AdminShell from "./AdminShell";

/**
 * 向后兼容的后台布局组件。
 * 历史页面继续使用 AdminLayout，但实际统一渲染新版 AdminShell。
 */
export function AdminLayout({ children, title = "Dashboard", subtitle, actions }) {
  return (
    <AdminShell title={title} subtitle={subtitle} actions={actions}>
      {children}
    </AdminShell>
  );
}
