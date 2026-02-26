export const dynamic = 'force-dynamic';

﻿"use client";

import { Suspense } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import Skeleton from "../../../components/common/Skeleton";

function SettingsContent() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Admin Access</h2>
        <p className="mt-2 text-sm text-slate-600">
          支持通过 Query/Header/Bearer Token 提供管理员认证。
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Environment</h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Backend API</p>
            <p className="mt-2">读取 `API_BASE_URL / NEXT_PUBLIC_API_BASE_URL`</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Swagger</p>
            <p className="mt-2">`/api/docs`</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Metrics Rules</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>Views: 请求章节内容时记一次。</li>
          <li>Registrations: 新注册成功时记一次。</li>
          <li>DAU: 当日有行为的去重登录用户数。</li>
        </ul>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <AdminLayout title="系统设置" subtitle="管理员访问、环境和指标口径说明。">
      <Suspense
        fallback={
          <div className="min-h-screen bg-neutral-950">
            <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
              <Skeleton className="h-10 w-56 rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-3xl" />
              <Skeleton className="h-64 w-full rounded-3xl" />
            </div>
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </AdminLayout>
  );
}
