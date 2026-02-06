"use client";

import { AdminAuthProvider } from "@/components/admin/AuthContext";

/**
 * 老王说：管理员页面布局
 * 这个SB布局为所有admin页面提供认证上下文
 */
export default function AdminLayout({ children }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
