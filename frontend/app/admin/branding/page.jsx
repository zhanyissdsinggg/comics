'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import AdminBrandingPage from '../../../components/admin/AdminBrandingPage';

export default function BrandingPage() {
  return (
    <AdminLayout
      title="品牌配置"
      subtitle="统一维护会直接影响前台观感的品牌素材、站点标识和首页横幅。"
    >
      <Suspense fallback={<div className="text-sm text-slate-500">正在加载品牌配置...</div>}>
        <AdminBrandingPage />
      </Suspense>
    </AdminLayout>
  );
}
