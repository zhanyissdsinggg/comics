"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import AdminShell from "./AdminShell";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../lib/apiClient";

const defaultForm = {
  id: "",
  title: "",
  description: "",
  type: "HOLIDAY",
  segment: "all",
  active: true,
  startAt: "",
  endAt: "",
  bonusMultiplier: 0,
  returningAfterDays: 7,
  autoGrant: false,
  priority: 0,
  coupon: {
    code: "",
    type: "DISCOUNT_PCT",
    value: 0,
    remainingUses: 1,
    label: "",
  },
  ctaType: "STORE",
  ctaTarget: "",
  ctaLabel: "",
};

const TYPE_LABELS = {
  FIRST_PURCHASE: "首充",
  HOLIDAY: "节日",
  RETURNING: "回流",
  SUB_VOUCHER: "订阅券",
};

const SEGMENT_LABELS = {
  all: "全部用户",
  first_purchase: "首充用户",
  returning: "回流用户",
  subscriber: "订阅用户",
};

export default function AdminPromotionsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState("");
  const [defaults, setDefaults] = useState({
    ctaType: "STORE",
    ctaTarget: "",
    ctaLabel: "查看活动",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const uploadRef = useRef(null);

  // 老王说：检查认证状态，未登录则重定向
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    const [promosResponse, defaultsResponse] = await Promise.all([
      apiGet(`/api/admin/promotions`),
      apiGet(`/api/admin/promotions/defaults`),
    ]);
    if (promosResponse.ok) {
      const list = promosResponse.data?.promotions || [];
      list.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
      setPromotions(list);
    }
    if (defaultsResponse.ok) {
      setDefaults((prev) => ({ ...prev, ...(defaultsResponse.data?.defaults || {}) }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadPromotions();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadPromotions]);

  const handleSubmit = async () => {
    if (!form.id) {
      return;
    }
    if (editingId) {
      await apiPatch(`/api/admin/promotions/${editingId}`, {
        promotion: form,
      });
    } else {
      await apiPost("/api/admin/promotions", { promotion: form });
    }
    setForm(defaultForm);
    setEditingId("");
    loadPromotions();
  };

  const handleEdit = (promo) => {
    setForm({
      ...defaultForm,
      ...promo,
      coupon: promo.coupon || { ...defaultForm.coupon },
    });
    setEditingId(promo.id);
  };

  const handleDelete = async (promoId) => {
    await apiDelete(`/api/admin/promotions/${promoId}`);
    loadPromotions();
  };

  const isCouponEnabled = useMemo(() => Boolean(form.coupon?.code), [form.coupon?.code]);

  const exportPromos = () => {
    const content = JSON.stringify(promotions, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "promotions-export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importPromos = async (file) => {
    if (!file) {
      return;
    }
    const text = await file.text();
    let list = [];
    try {
      list = JSON.parse(text);
    } catch (err) {
      return;
    }
    if (!Array.isArray(list)) {
      return;
    }
    for (const promo of list) {
      if (promo?.id) {
        await apiPost("/api/admin/promotions", { promotion: promo });
      }
    }
    loadPromotions();
  };

  const toggleActive = async (promo) => {
    await apiPatch(`/api/admin/promotions/${promo.id}`, {
      promotion: { ...promo, active: !promo.active },
    });
    loadPromotions();
  };

  const movePriority = async (promo, delta) => {
    const nextPriority = Number(promo.priority || 0) + delta;
    await apiPatch(`/api/admin/promotions/${promo.id}`, {
      promotion: { ...promo, priority: nextPriority },
    });
    loadPromotions();
  };

  // 老王说：如果正在加载或未认证，显示加载状态
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AdminShell title="活动配置" subtitle="更简洁的活动管理面板">
      <div className="space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">
              {editingId ? "编辑活动" : "创建活动"}
            </h3>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
            >
              {showAdvanced ? "收起高级" : "高级设置"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={form.id}
              onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
              placeholder="活动 ID"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              disabled={Boolean(editingId)}
            />
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="活动标题"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="活动描述"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="FIRST_PURCHASE">首充</option>
              <option value="HOLIDAY">节日</option>
              <option value="RETURNING">回流</option>
              <option value="SUB_VOUCHER">订阅券</option>
            </select>
            <select
              value={form.segment}
              onChange={(event) => setForm((prev) => ({ ...prev, segment: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">全部用户</option>
              <option value="first_purchase">首充用户</option>
              <option value="returning">回流用户</option>
              <option value="subscriber">订阅用户</option>
            </select>
            <input
              value={form.startAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
              placeholder="开始时间 (ISO)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={form.endAt}
              onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))}
              placeholder="结束时间 (ISO)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, active: event.target.checked }))
                }
              />
              启用
            </label>
          </div>

          {showAdvanced ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h4 className="text-sm font-semibold">高级参数</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    value={form.bonusMultiplier}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, bonusMultiplier: event.target.value }))
                    }
                    placeholder="奖励倍数"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={form.returningAfterDays}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, returningAfterDays: event.target.value }))
                    }
                    placeholder="回流天数"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={form.priority}
                    onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                    placeholder="优先级（数字越大越靠前）"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.autoGrant}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, autoGrant: event.target.checked }))
                      }
                    />
                    自动发放券
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h4 className="text-sm font-semibold">优惠券（可选）</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    value={form.coupon?.code || ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        coupon: { ...prev.coupon, code: event.target.value.toUpperCase() },
                      }))
                    }
                    placeholder="券码"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <select
                    value={form.coupon?.type || "DISCOUNT_PCT"}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        coupon: { ...prev.coupon, type: event.target.value },
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    disabled={!isCouponEnabled}
                  >
                    <option value="DISCOUNT_PCT">折扣百分比</option>
                    <option value="DISCOUNT_PTS">点数减免</option>
                    <option value="FREE_EPISODE">免费章节</option>
                  </select>
                  <input
                    value={form.coupon?.value ?? 0}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        coupon: { ...prev.coupon, value: event.target.value },
                      }))
                    }
                    placeholder="优惠值"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    disabled={!isCouponEnabled}
                  />
                  <input
                    value={form.coupon?.remainingUses ?? 1}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        coupon: { ...prev.coupon, remainingUses: event.target.value },
                      }))
                    }
                    placeholder="可用次数"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    disabled={!isCouponEnabled}
                  />
                  <input
                    value={form.coupon?.label || ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        coupon: { ...prev.coupon, label: event.target.value },
                      }))
                    }
                    placeholder="标签"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    disabled={!isCouponEnabled}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h4 className="text-sm font-semibold">通知 CTA</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    value={form.ctaType}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, ctaType: event.target.value }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="STORE">去商店</option>
                    <option value="SUBSCRIBE">订阅</option>
                    <option value="SERIES">作品页</option>
                    <option value="READ">阅读</option>
                    <option value="URL">外链</option>
                  </select>
                  <input
                    value={form.ctaTarget}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, ctaTarget: event.target.value }))
                    }
                    placeholder="目标 (seriesId 或 seriesId/episodeId 或 URL)"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={form.ctaLabel}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, ctaLabel: event.target.value }))
                    }
                    placeholder="按钮文案"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h4 className="text-sm font-semibold">默认 CTA</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    value={defaults.ctaType}
                    onChange={(event) =>
                      setDefaults((prev) => ({ ...prev, ctaType: event.target.value }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="STORE">去商店</option>
                    <option value="SUBSCRIBE">订阅</option>
                    <option value="SERIES">作品页</option>
                    <option value="READ">阅读</option>
                    <option value="URL">外链</option>
                  </select>
                  <input
                    value={defaults.ctaTarget}
                    onChange={(event) =>
                      setDefaults((prev) => ({ ...prev, ctaTarget: event.target.value }))
                    }
                    placeholder="目标"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={defaults.ctaLabel}
                    onChange={(event) =>
                      setDefaults((prev) => ({ ...prev, ctaLabel: event.target.value }))
                    }
                    placeholder="按钮文案"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await apiPatch(`/api/admin/promotions/defaults`, {
                      defaults,
                    });
                    loadPromotions();
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600"
                >
                  保存默认 CTA
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportPromos}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                >
                  导出 JSON
                </button>
                <button
                  type="button"
                  onClick={() => uploadRef.current?.click()}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                >
                  导入 JSON
                </button>
                <input
                  ref={uploadRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    importPromos(file);
                    event.target.value = "";
                  }}
                />
              </div>
            </>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {editingId ? "保存" : "创建"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setForm(defaultForm);
                  setEditingId("");
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                取消
              </button>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">活动列表</h3>
            {loading ? <span className="text-xs text-slate-400">加载中...</span> : null}
          </div>
          <div className="space-y-3">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{promo.title}</p>
                  <p className="text-xs text-slate-500">
                    {TYPE_LABELS[promo.type] || promo.type} · {SEGMENT_LABELS[promo.segment] || promo.segment}
                  </p>
                  {promo.startAt || promo.endAt ? (
                    <p className="text-[10px] text-slate-500">
                      {promo.startAt || "-"} ~ {promo.endAt || "-"}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(promo)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                  >
                    {promo.active ? "暂停" : "发布"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(promo)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(promo.id)}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600"
                  >
                    删除
                  </button>
                  {showAdvanced ? (
                    <>
                      <button
                        type="button"
                        onClick={() => movePriority(promo, 1)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                      >
                        上移
                      </button>
                      <button
                        type="button"
                        onClick={() => movePriority(promo, -1)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                      >
                        下移
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
