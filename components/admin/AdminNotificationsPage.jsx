"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "./AdminShell";
import { apiGet, apiPost } from "../../lib/apiClient";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

export default function AdminNotificationsPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const isAuthorized = key === ADMIN_KEY;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    message: "",
    userId: "",
    broadcast: false,
    type: "PROMO",
  });

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/notifications?key=${key}`);
    if (response.ok) {
      setNotifications(response.data?.notifications || []);
    }
    setLoading(false);
  }, [key]);

  useEffect(() => {
    if (isAuthorized) {
      loadNotifications();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, loadNotifications]);

  const handleSend = async () => {
    if (!form.title) {
      return;
    }
    await apiPost("/api/admin/notifications", {
      key,
      notification: form,
    });
    setForm({ title: "", message: "", userId: "", broadcast: false, type: "PROMO" });
    loadNotifications();
  };

  if (!isAuthorized) {
    return (
      <AdminShell title="403 Forbidden" subtitle="无效的管理员密钥">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">403 Forbidden</h2>
            <p className="mt-2 text-sm text-slate-500">Invalid admin key.</p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="通知中心" subtitle="运营通知 / 测试推送">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold">发送通知</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="标题"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="内容"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="PROMO">运营</option>
              <option value="NEW_EPISODE">新章节</option>
              <option value="TTF_READY">TTF 可领</option>
            </select>
            <input
              value={form.userId}
              onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
              placeholder="指定用户ID（可选）"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.broadcast}
                onChange={(event) => setForm((prev) => ({ ...prev, broadcast: event.target.checked }))}
              />
              广播所有用户
            </label>
          </div>
          <button
            type="button"
            onClick={handleSend}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            发送通知
          </button>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">通知列表</h3>
            {loading ? <span className="text-xs text-slate-400">加载中...</span> : null}
          </div>
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.message}</p>
                <p className="text-[10px] text-slate-400">
                  {item.type} · {item.userId || "broadcast"} · {item.createdAt}
                </p>
              </div>
            ))}
            {!loading && notifications.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                暂无通知
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
