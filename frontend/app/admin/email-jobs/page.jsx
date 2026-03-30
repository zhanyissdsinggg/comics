'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import AdminEmailJobsPage from '../../../components/admin/AdminEmailJobsPage';

export default function EmailJobsPage() {
  return (
    <AdminLayout
      title="邮件任务"
      subtitle="集中查看投递队列、发送历史，以及当前外发邮件的运行状态。"
    >
      <Suspense fallback={<div className="text-sm text-slate-500">正在加载邮件任务...</div>}>
        <AdminEmailJobsPage />
      </Suspense>
    </AdminLayout>
  );
}
