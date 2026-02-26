"use client";

import { AdminAuthProvider } from "../../components/admin/AuthContext";

/**
 * 老王说：管理员页面布局
 * 这个SB布局为所有admin页面提供认证上下文
 *
 * 禁用预渲染：admin页面都是动态的，需要认证和React Query
 */
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
