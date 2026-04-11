"use client";

import AdminShell from "./AdminShell";

/**
 * 旧后台页仍然通过 AdminLayout 渲染，但共享的 AdminShell
 * 已经接管了后台壳子、间距和导航语言。
 */
export function AdminLayout({ children, title = "仪表盘", subtitle, actions }) {
  return (
    <AdminShell title={title} subtitle={subtitle} actions={actions}>
      {children}
    </AdminShell>
  );
}
