"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import AdminShell from "./AdminShell";
import { apiGet, apiPatch } from "../../lib/apiClient";

function parseGenres(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminSeriesEditPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const seriesId = params.id;
  const [series, setSeries] = useState(null);
  const [form, setForm] = useState(null);
  const isAuthorized = key === ADMIN_KEY;

  useEffect(() => {
    // 老王说：如果正在加载或未认证，显示加载状态
  if (isLoading || !isAuthenticated) {
    return null;
  }

  if (!form) {
    return (
      <AdminShell title="加载中" subtitle={seriesId}>
        <div className="text-sm text-slate-500">加载中...</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="编辑作品"
      subtitle={series?.id}
      actions={
        <button
          type="button"
          onClick={() =>
            router.push(`/admin/series/${seriesId}/episodes`)
          }
          className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600"
        >
          编辑章节
        </button>
      }
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="作品标题"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={form.genres}
              onChange={(event) => setForm((prev) => ({ ...prev, genres: event.target.value }))}
              placeholder="分类（逗号分隔）"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="comic">漫画</option>
              <option value="novel">小说</option>
            </select>
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="Ongoing">连载中</option>
              <option value="Completed">已完结</option>
              <option value="Hiatus">暂停</option>
            </select>
            <input
              value={form.coverUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, coverUrl: event.target.value }))}
              placeholder="封面图 URL"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={form.coverTone}
              onChange={(event) => setForm((prev) => ({ ...prev, coverTone: event.target.value }))}
              placeholder="封面色调"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={form.badge}
              onChange={(event) => setForm((prev) => ({ ...prev, badge: event.target.value }))}
              placeholder="徽标"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.adult}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, adult: event.target.checked }))
                }
              />
              成人向
            </label>
          </div>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="作品简介"
            className="h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold">定价与 TTF</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={form.pricing.currency}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  pricing: { ...prev.pricing, currency: event.target.value },
                }))
              }
              placeholder="货币"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={form.pricing.episodePrice}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  pricing: { ...prev.pricing, episodePrice: event.target.value },
                }))
              }
              placeholder="单章价格"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={form.pricing.discount}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  pricing: { ...prev.pricing, discount: event.target.value },
                }))
              }
              placeholder="折扣"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.ttf.enabled}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    ttf: { ...prev.ttf, enabled: event.target.checked },
                  }))
                }
              />
              启用 TTF
            </label>
            <input
              type="number"
              value={form.ttf.intervalHours}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  ttf: { ...prev.ttf, intervalHours: event.target.value },
                }))
              }
              placeholder="间隔小时"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
        </section>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          保存修改
        </button>
      </div>
    </AdminShell>
  );
}
