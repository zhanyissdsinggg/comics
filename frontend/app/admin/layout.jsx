"use client";

import { AdminAuthProvider } from "../../components/admin/AuthContext";
import { QueryWrapper } from "./QueryWrapper";

/**
 * 老王说：管理员页面布局
 * 这个SB布局为所有admin页面提供认证上下文和React Query
 *
 * 使用QueryWrapper动态导入QueryProvider，避免构建时错误
 *
 * 禁用预渲染：admin页面都是动态的，需要认证和React Query
 */
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }) {
  return (
    <QueryWrapper>
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </QueryWrapper>
  );
}
