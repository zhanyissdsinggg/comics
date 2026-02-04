"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "./AdminShell";
import { apiGet, apiPatch, apiPost } from "../../lib/apiClient";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

const defaultTopup = {
  id: "",
  label: "",
  paidPts: 0,
  bonusPts: 0,
  price: 0,
  currency: "USD",
  active: true,
  tags: "",
};

const defaultPlan = {
  id: "",
  label: "",
  discountPct: 0,
  dailyFreeUnlocks: 0,
  ttfMultiplier: 1,
  voucherPts: 0,
  price: 0,
  currency: "USD",
  active: true,
};

function toTopupDraft(pkg) {
  return {
    id: pkg.id || "",
    label: pkg.label || "",
    paidPts: Number(pkg.paidPts || 0),
    bonusPts: Number(pkg.bonusPts || 0),
    price: Number(pkg.price || 0),
    currency: pkg.currency || "USD",
    active: pkg.active !== false,
    tags: Array.isArray(pkg.tags) ? pkg.tags.join(",") : "",
  };
}

function toPlanDraft(plan) {
  return {
    id: plan.id || "",
    label: plan.label || "",
    discountPct: Number(plan.discountPct || 0),
    dailyFreeUnlocks: Number(plan.dailyFreeUnlocks || 0),
    ttfMultiplier: Number(plan.ttfMultiplier || 1),
    voucherPts: Number(plan.voucherPts || 0),
    price: Number(plan.price || 0),
    currency: plan.currency || "USD",
    active: plan.active !== false,
  };
}

export default function AdminBillingPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const isAuthorized = key === ADMIN_KEY;
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [plans, setPlans] = useState([]);
  const [packageDrafts, setPackageDrafts] = useState({});
  const [planDrafts, setPlanDrafts] = useState({});
  const [newTopup, setNewTopup] = useState(defaultTopup);
  const [newPlan, setNewPlan] = useState(defaultPlan);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [topupsResponse, plansResponse] = await Promise.all([
      apiGet(`/api/admin/billing/topups?key=${key}`),
      apiGet(`/api/admin/billing/plans?key=${key}`),
    ]);
    if (topupsResponse.ok) {
      const list = topupsResponse.data?.packages || [];
      setPackages(list);
      const drafts = {};
      list.forEach((pkg) => {
        drafts[pkg.id] = toTopupDraft(pkg);
      });
      setPackageDrafts(drafts);
    }
    if (plansResponse.ok) {
      const list = plansResponse.data?.plans || [];
      setPlans(list);
      const drafts = {};
      list.forEach((plan) => {
        drafts[plan.id] = toPlanDraft(plan);
      });
      setPlanDrafts(drafts);
    }
    setLoading(false);
  }, [key]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, loadData]);

  const updateTopupDraft = (id, field, value) => {
    setPackageDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const updatePlanDraft = (id, field, value) => {
    setPlanDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveTopup = async (id) => {
    const draft = packageDrafts[id];
    if (!draft) {
      return;
    }
    const payload = {
      key,
      paidPts: Number(draft.paidPts || 0),
      bonusPts: Number(draft.bonusPts || 0),
      price: Number(draft.price || 0),
      currency: draft.currency || "USD",
      active: Boolean(draft.active),
      label: draft.label || "",
      tags: draft.tags
        ? draft.tags.split(",").map((value) => value.trim()).filter(Boolean)
        : [],
    };
    await apiPatch(`/api/admin/billing/topups/${id}?key=${key}`, payload);
    loadData();
  };

  const savePlan = async (id) => {
    const draft = planDrafts[id];
    if (!draft) {
      return;
    }
    const payload = {
      key,
      discountPct: Number(draft.discountPct || 0),
      dailyFreeUnlocks: Number(draft.dailyFreeUnlocks || 0),
      ttfMultiplier: Number(draft.ttfMultiplier || 0),
      voucherPts: Number(draft.voucherPts || 0),
      price: Number(draft.price || 0),
      currency: draft.currency || "USD",
      active: Boolean(draft.active),
      label: draft.label || "",
    };
    await apiPatch(`/api/admin/billing/plans/${id}?key=${key}`, payload);
    loadData();
  };

  const createTopup = async () => {
    if (!newTopup.id) {
      return;
    }
    const payload = {
      key,
      id: newTopup.id,
      label: newTopup.label,
      paidPts: Number(newTopup.paidPts || 0),
      bonusPts: Number(newTopup.bonusPts || 0),
      price: Number(newTopup.price || 0),
      currency: newTopup.currency || "USD",
      active: Boolean(newTopup.active),
      tags: newTopup.tags
        ? newTopup.tags.split(",").map((value) => value.trim()).filter(Boolean)
        : [],
    };
    await apiPost("/api/admin/billing/topups", payload);
    setNewTopup(defaultTopup);
    loadData();
  };

  const createPlan = async () => {
    if (!newPlan.id) {
      return;
    }
    const payload = {
      key,
      id: newPlan.id,
      label: newPlan.label,
      discountPct: Number(newPlan.discountPct || 0),
      dailyFreeUnlocks: Number(newPlan.dailyFreeUnlocks || 0),
      ttfMultiplier: Number(newPlan.ttfMultiplier || 0),
      voucherPts: Number(newPlan.voucherPts || 0),
      price: Number(newPlan.price || 0),
      currency: newPlan.currency || "USD",
      active: Boolean(newPlan.active),
    };
    await apiPost("/api/admin/billing/plans", payload);
    setNewPlan(defaultPlan);
    loadData();
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
    <AdminShell title="套餐定价" subtitle="点数套餐与订阅权益定价">
      <div className="space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">点数套餐</h3>
            {loading ? <span className="text-xs text-slate-400">加载中...</span> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-7 text-xs text-slate-500">
            <span>ID</span>
            <span>名称</span>
            <span>付费点数</span>
            <span>赠送点数</span>
            <span>价格</span>
            <span>货币</span>
            <span>启用</span>
          </div>

          {packages.map((pkg) => {
            const draft = packageDrafts[pkg.id] || toTopupDraft(pkg);
            return (
              <div key={pkg.id} className="grid gap-3 md:grid-cols-7 items-center">
                <div className="text-sm font-semibold text-slate-700">{pkg.id}</div>
                <input
                  value={draft.label}
                  onChange={(event) => updateTopupDraft(pkg.id, "label", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <input
                  value={draft.paidPts}
                  onChange={(event) => updateTopupDraft(pkg.id, "paidPts", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <input
                  value={draft.bonusPts}
                  onChange={(event) => updateTopupDraft(pkg.id, "bonusPts", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <input
                  value={draft.price}
                  onChange={(event) => updateTopupDraft(pkg.id, "price", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <input
                  value={draft.currency}
                  onChange={(event) => updateTopupDraft(pkg.id, "currency", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(event) => updateTopupDraft(pkg.id, "active", event.target.checked)}
                  />
                  启用
                </label>
                <div className="md:col-span-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={draft.tags}
                      onChange={(event) => updateTopupDraft(pkg.id, "tags", event.target.value)}
                      placeholder="标签 (逗号分隔)"
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => saveTopup(pkg.id)}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="text-sm font-semibold">新增点数套餐</h4>
            <div className="grid gap-3 md:grid-cols-7">
              <input
                value={newTopup.id}
                onChange={(event) => setNewTopup((prev) => ({ ...prev, id: event.target.value }))}
                placeholder="ID"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newTopup.label}
                onChange={(event) => setNewTopup((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="名称"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newTopup.paidPts}
                onChange={(event) => setNewTopup((prev) => ({ ...prev, paidPts: event.target.value }))}
                placeholder="付费点数"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newTopup.bonusPts}
                onChange={(event) => setNewTopup((prev) => ({ ...prev, bonusPts: event.target.value }))}
                placeholder="赠送点数"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newTopup.price}
                onChange={(event) => setNewTopup((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="价格"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newTopup.currency}
                onChange={(event) => setNewTopup((prev) => ({ ...prev, currency: event.target.value }))}
                placeholder="货币"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={newTopup.active}
                  onChange={(event) => setNewTopup((prev) => ({ ...prev, active: event.target.checked }))}
                />
                启用
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={newTopup.tags}
                onChange={(event) => setNewTopup((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="标签 (逗号分隔)"
                className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={createTopup}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              >
                新增
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">订阅套餐</h3>
            {loading ? <span className="text-xs text-slate-400">加载中...</span> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-8 text-xs text-slate-500">
            <span>ID</span>
            <span>名称</span>
            <span>折扣%</span>
            <span>每日免费</span>
            <span>TTF 倍速</span>
            <span>订阅券</span>
            <span>价格</span>
            <span>货币</span>
          </div>

          {plans.map((plan) => {
            const draft = planDrafts[plan.id] || toPlanDraft(plan);
            return (
              <div key={plan.id} className="grid gap-3 md:grid-cols-8 items-center">
                <div className="text-sm font-semibold text-slate-700">{plan.id}</div>
                <input
                  value={draft.label}
                  onChange={(event) => updatePlanDraft(plan.id, "label", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <input
                  value={draft.discountPct}
                  onChange={(event) => updatePlanDraft(plan.id, "discountPct", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <input
                  value={draft.dailyFreeUnlocks}
                  onChange={(event) => updatePlanDraft(plan.id, "dailyFreeUnlocks", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <input
                  value={draft.ttfMultiplier}
                  onChange={(event) => updatePlanDraft(plan.id, "ttfMultiplier", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <input
                  value={draft.voucherPts}
                  onChange={(event) => updatePlanDraft(plan.id, "voucherPts", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <input
                  value={draft.price}
                  onChange={(event) => updatePlanDraft(plan.id, "price", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <input
                  value={draft.currency}
                  onChange={(event) => updatePlanDraft(plan.id, "currency", event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <div className="md:col-span-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={draft.active}
                        onChange={(event) => updatePlanDraft(plan.id, "active", event.target.checked)}
                      />
                      启用
                    </label>
                    <button
                      type="button"
                      onClick={() => savePlan(plan.id)}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="text-sm font-semibold">新增订阅套餐</h4>
            <div className="grid gap-3 md:grid-cols-8">
              <input
                value={newPlan.id}
                onChange={(event) => setNewPlan((prev) => ({ ...prev, id: event.target.value }))}
                placeholder="ID"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newPlan.label}
                onChange={(event) => setNewPlan((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="名称"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newPlan.discountPct}
                onChange={(event) => setNewPlan((prev) => ({ ...prev, discountPct: event.target.value }))}
                placeholder="折扣%"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newPlan.dailyFreeUnlocks}
                onChange={(event) => setNewPlan((prev) => ({ ...prev, dailyFreeUnlocks: event.target.value }))}
                placeholder="每日免费"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newPlan.ttfMultiplier}
                onChange={(event) => setNewPlan((prev) => ({ ...prev, ttfMultiplier: event.target.value }))}
                placeholder="TTF 倍速"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newPlan.voucherPts}
                onChange={(event) => setNewPlan((prev) => ({ ...prev, voucherPts: event.target.value }))}
                placeholder="订阅券"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newPlan.price}
                onChange={(event) => setNewPlan((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="价格"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <input
                value={newPlan.currency}
                onChange={(event) => setNewPlan((prev) => ({ ...prev, currency: event.target.value }))}
                placeholder="货币"
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={newPlan.active}
                  onChange={(event) => setNewPlan((prev) => ({ ...prev, active: event.target.checked }))}
                />
                启用
              </label>
            </div>
            <div>
              <button
                type="button"
                onClick={createPlan}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              >
                新增
              </button>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
