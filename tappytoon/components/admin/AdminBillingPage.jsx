"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import { apiGet, apiPatch, apiPost } from "../../lib/apiClient";
import {
  DollarSign,
  Coins,
  CreditCard,
  Plus,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";

/**
 * 老王重新设计：套餐定价管理页面
 * 简化版本：
 * - 去掉不必要的tags字段
 * - 使用卡片式布局,更清晰
 * - 统一emerald主题
 * - 添加状态通知系统
 */

const defaultTopup = {
  id: "",
  label: "",
  paidPts: 0,
  bonusPts: 0,
  price: 0,
  currency: "USD",
  active: true,
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

export default function AdminBillingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [plans, setPlans] = useState([]);
  const [editingTopup, setEditingTopup] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [newTopup, setNewTopup] = useState(defaultTopup);
  const [newPlan, setNewPlan] = useState(defaultPlan);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const showStatus = (type, text) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage({ type: "", text: "" }), 3000);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [topupsResponse, plansResponse] = await Promise.all([
      apiGet(`/api/admin/billing/topups`),
      apiGet(`/api/admin/billing/plans`),
    ]);
    if (topupsResponse.ok) {
      // 老王修复：过滤掉null/undefined元素，防止访问null.label报错
      setPackages((topupsResponse.data?.packages || []).filter(Boolean));
    }
    if (plansResponse.ok) {
      // 老王修复：过滤掉null/undefined元素，防止访问null.label报错
      setPlans((plansResponse.data?.plans || []).filter(Boolean));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadData]);

  const saveTopup = async (topup) => {
    if (!topup.id || !topup.label) {
      showStatus("error", "请填写ID和名称");
      return;
    }
    if (topup.paidPts <= 0) {
      showStatus("error", "付费点数必须大于0");
      return;
    }
    if (topup.price <= 0) {
      showStatus("error", "价格必须大于0");
      return;
    }

    const payload = {
      paidPts: Number(topup.paidPts || 0),
      bonusPts: Number(topup.bonusPts || 0),
      price: Number(topup.price || 0),
      currency: topup.currency || "USD",
      active: Boolean(topup.active),
      label: topup.label || "",
    };

    const response = await apiPatch(`/api/admin/billing/topups/${topup.id}`, payload);
    if (response.ok) {
      showStatus("success", "保存成功");
      setEditingTopup(null);
      loadData();
    } else {
      showStatus("error", `保存失败：${response.error || "未知错误"}`);
    }
  };

  const savePlan = async (plan) => {
    if (!plan.id || !plan.label) {
      showStatus("error", "请填写ID和名称");
      return;
    }
    if (plan.price <= 0) {
      showStatus("error", "价格必须大于0");
      return;
    }

    const payload = {
      discountPct: Number(plan.discountPct || 0),
      dailyFreeUnlocks: Number(plan.dailyFreeUnlocks || 0),
      ttfMultiplier: Number(plan.ttfMultiplier || 1),
      voucherPts: Number(plan.voucherPts || 0),
      price: Number(plan.price || 0),
      currency: plan.currency || "USD",
      active: Boolean(plan.active),
      label: plan.label || "",
    };

    const response = await apiPatch(`/api/admin/billing/plans/${plan.id}`, payload);
    if (response.ok) {
      showStatus("success", "保存成功");
      setEditingPlan(null);
      loadData();
    } else {
      showStatus("error", `保存失败：${response.error || "未知错误"}`);
    }
  };

  const createTopup = async () => {
    if (!newTopup.id || !newTopup.label) {
      showStatus("error", "请填写ID和名称");
      return;
    }
    if (newTopup.paidPts <= 0) {
      showStatus("error", "付费点数必须大于0");
      return;
    }
    if (newTopup.price <= 0) {
      showStatus("error", "价格必须大于0");
      return;
    }

    const payload = {
      id: newTopup.id,
      label: newTopup.label,
      paidPts: Number(newTopup.paidPts || 0),
      bonusPts: Number(newTopup.bonusPts || 0),
      price: Number(newTopup.price || 0),
      currency: newTopup.currency || "USD",
      active: Boolean(newTopup.active),
    };

    const response = await apiPost("/api/admin/billing/topups", payload);
    if (response.ok) {
      showStatus("success", "创建成功");
      setNewTopup(defaultTopup);
      loadData();
    } else {
      showStatus("error", `创建失败：${response.error || "未知错误"}`);
    }
  };

  const createPlan = async () => {
    if (!newPlan.id || !newPlan.label) {
      showStatus("error", "请填写ID和名称");
      return;
    }
    if (newPlan.price <= 0) {
      showStatus("error", "价格必须大于0");
      return;
    }

    const payload = {
      id: newPlan.id,
      label: newPlan.label,
      discountPct: Number(newPlan.discountPct || 0),
      dailyFreeUnlocks: Number(newPlan.dailyFreeUnlocks || 0),
      ttfMultiplier: Number(newPlan.ttfMultiplier || 1),
      voucherPts: Number(newPlan.voucherPts || 0),
      price: Number(newPlan.price || 0),
      currency: newPlan.currency || "USD",
      active: Boolean(newPlan.active),
    };

    const response = await apiPost("/api/admin/billing/plans", payload);
    if (response.ok) {
      showStatus("success", "创建成功");
      setNewPlan(defaultPlan);
      loadData();
    } else {
      showStatus("error", `创建失败：${response.error || "未知错误"}`);
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 状态通知 */}
        {statusMessage.text && (
          <div
            className={`rounded-[12px] border px-4 py-3 ${
              statusMessage.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* 点数套餐区域 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
              <Coins className="h-5 w-5 text-emerald-600" />
              点数套餐
            </h3>
            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* 现有套餐列表 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => {
              const isEditing = editingTopup?.id === pkg.id;
              const draft = isEditing ? editingTopup : pkg;

              return (
                <div
                  key={pkg.id}
                  className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-neutral-100">{pkg.id}</span>
                    </div>
                    {pkg.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <CheckCircle className="h-3 w-3" />
                        启用
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        <XCircle className="h-3 w-3" />
                        禁用
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">名称</label>
                      <input
                        value={draft?.label || ""}
                        onChange={(e) =>
                          isEditing
                            ? setEditingTopup({ ...draft, label: e.target.value })
                            : setEditingTopup({ ...pkg, label: e.target.value })
                        }
                        disabled={!isEditing}
                        className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">付费点数</label>
                        <input
                          type="number"
                          value={draft?.paidPts || 0}
                          onChange={(e) =>
                            isEditing
                              ? setEditingTopup({ ...draft, paidPts: e.target.value })
                              : setEditingTopup({ ...pkg, paidPts: e.target.value })
                          }
                          disabled={!isEditing}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">赠送点数</label>
                        <input
                          type="number"
                          value={draft?.bonusPts || 0}
                          onChange={(e) =>
                            isEditing
                              ? setEditingTopup({ ...draft, bonusPts: e.target.value })
                              : setEditingTopup({ ...pkg, bonusPts: e.target.value })
                          }
                          disabled={!isEditing}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">价格</label>
                        <input
                          type="number"
                          step="0.01"
                          value={draft?.price || 0}
                          onChange={(e) =>
                            isEditing
                              ? setEditingTopup({ ...draft, price: e.target.value })
                              : setEditingTopup({ ...pkg, price: e.target.value })
                          }
                          disabled={!isEditing}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">货币</label>
                        <input
                          value={draft?.currency || ""}
                          onChange={(e) =>
                            isEditing
                              ? setEditingTopup({ ...draft, currency: e.target.value })
                              : setEditingTopup({ ...pkg, currency: e.target.value })
                          }
                          disabled={!isEditing}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs text-neutral-300">
                        <input
                          type="checkbox"
                          checked={draft?.active || false}
                          onChange={(e) =>
                            isEditing
                              ? setEditingTopup({ ...draft, active: e.target.checked })
                              : setEditingTopup({ ...pkg, active: e.target.checked })
                          }
                          disabled={!isEditing}
                          className="rounded border-emerald-500/20"
                        />
                        启用此套餐
                      </label>
                    </div>

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveTopup(draft)}
                            className="flex-1 rounded-[12px] bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                          >
                            <Save className="h-3 w-3 inline mr-1" />
                            保存
                          </button>
                          <button
                            onClick={() => setEditingTopup(null)}
                            className="flex-1 rounded-[12px] border border-emerald-500/20 px-3 py-2 text-xs font-semibold text-neutral-300 transition-colors hover:bg-neutral-800/50"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditingTopup(pkg)}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                        >
                          编辑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 新增套餐表单 */}
          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              新增点数套餐
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  套餐ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={newTopup.id}
                  onChange={(e) => setNewTopup({ ...newTopup, id: e.target.value })}
                  placeholder="例如: topup-500"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  value={newTopup.label}
                  onChange={(e) => setNewTopup({ ...newTopup, label: e.target.value })}
                  placeholder="例如: 500点数套餐"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  付费点数 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={newTopup.paidPts}
                  onChange={(e) => setNewTopup({ ...newTopup, paidPts: e.target.value })}
                  placeholder="500"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">赠送点数</label>
                <input
                  type="number"
                  value={newTopup.bonusPts}
                  onChange={(e) => setNewTopup({ ...newTopup, bonusPts: e.target.value })}
                  placeholder="120"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  价格 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTopup.price}
                  onChange={(e) => setNewTopup({ ...newTopup, price: e.target.value })}
                  placeholder="29.99"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">货币</label>
                <input
                  value={newTopup.currency}
                  onChange={(e) => setNewTopup({ ...newTopup, currency: e.target.value })}
                  placeholder="USD"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={newTopup.active}
                  onChange={(e) => setNewTopup({ ...newTopup, active: e.target.checked })}
                  className="rounded border-emerald-500/20"
                />
                启用此套餐
              </label>
              <button
                onClick={createTopup}
                className="rounded-[12px] bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                创建套餐
              </button>
            </div>
          </div>
        </section>

        {/* 订阅套餐区域 */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            订阅套餐
          </h3>

          {/* 现有订阅套餐列表 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isEditing = editingPlan?.id === plan.id;
              const draft = isEditing ? editingPlan : plan;

              return (
                <div
                  key={plan.id}
                  className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-neutral-100">{plan.id}</span>
                    </div>
                    {plan.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <CheckCircle className="h-3 w-3" />
                        启用
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        <XCircle className="h-3 w-3" />
                        禁用
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">名称</label>
                      <input
                        value={draft?.label || ""}
                        onChange={(e) =>
                          isEditing
                            ? setEditingPlan({ ...draft, label: e.target.value })
                            : setEditingPlan({ ...plan, label: e.target.value })
                        }
                        disabled={!isEditing}
                        className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">折扣%</label>
                        <input
                          type="number"
                          value={draft?.discountPct || 0}
                          onChange={(e) =>
                            isEditing
                              ? setEditingPlan({ ...draft, discountPct: e.target.value })
                              : setEditingPlan({ ...plan, discountPct: e.target.value })
                          }
                          disabled={!isEditing}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">每日免费</label>
                        <input
                          type="number"
                          value={draft?.dailyFreeUnlocks || 0}
                          onChange={(e) =>
                            isEditing
                              ? setEditingPlan({ ...draft, dailyFreeUnlocks: e.target.value })
                              : setEditingPlan({ ...plan, dailyFreeUnlocks: e.target.value })
                          }
                          disabled={!isEditing}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">TTF倍速</label>
                        <input
                          type="number"
                          step="0.1"
                          value={draft?.ttfMultiplier || 1}
                          onChange={(e) =>
                            isEditing
                              ? setEditingPlan({ ...draft, ttfMultiplier: e.target.value })
                              : setEditingPlan({ ...plan, ttfMultiplier: e.target.value })
                          }
                          disabled={!isEditing}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">订阅券</label>
                        <input
                          type="number"
                          value={draft?.voucherPts || 0}
                          onChange={(e) =>
                            isEditing
                              ? setEditingPlan({ ...draft, voucherPts: e.target.value })
                              : setEditingPlan({ ...plan, voucherPts: e.target.value })
                          }
                          disabled={!isEditing}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">价格</label>
                        <input
                          type="number"
                          step="0.01"
                          value={draft?.price || 0}
                          onChange={(e) =>
                            isEditing
                              ? setEditingPlan({ ...draft, price: e.target.value })
                              : setEditingPlan({ ...plan, price: e.target.value })
                          }
                          disabled={!isEditing}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">货币</label>
                        <input
                          value={draft?.currency || ""}
                          onChange={(e) =>
                            isEditing
                              ? setEditingPlan({ ...draft, currency: e.target.value })
                              : setEditingPlan({ ...plan, currency: e.target.value })
                          }
                          disabled={!isEditing}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs text-neutral-300">
                        <input
                          type="checkbox"
                          checked={draft?.active || false}
                          onChange={(e) =>
                            isEditing
                              ? setEditingPlan({ ...draft, active: e.target.checked })
                              : setEditingPlan({ ...plan, active: e.target.checked })
                          }
                          disabled={!isEditing}
                          className="rounded border-emerald-500/20"
                        />
                        启用此套餐
                      </label>
                    </div>

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => savePlan(draft)}
                            className="flex-1 rounded-[12px] bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                          >
                            <Save className="h-3 w-3 inline mr-1" />
                            保存
                          </button>
                          <button
                            onClick={() => setEditingPlan(null)}
                            className="flex-1 rounded-[12px] border border-emerald-500/20 px-3 py-2 text-xs font-semibold text-neutral-300 transition-colors hover:bg-neutral-800/50"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditingPlan(plan)}
                          className="w-full rounded-[12px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                        >
                          编辑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 新增订阅套餐表单 */}
          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              新增订阅套餐
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  套餐ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={newPlan.id}
                  onChange={(e) => setNewPlan({ ...newPlan, id: e.target.value })}
                  placeholder="例如: plan-monthly"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  value={newPlan.label}
                  onChange={(e) => setNewPlan({ ...newPlan, label: e.target.value })}
                  placeholder="例如: 月度订阅"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">折扣百分比</label>
                <input
                  type="number"
                  value={newPlan.discountPct}
                  onChange={(e) => setNewPlan({ ...newPlan, discountPct: e.target.value })}
                  placeholder="20"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">每日免费解锁</label>
                <input
                  type="number"
                  value={newPlan.dailyFreeUnlocks}
                  onChange={(e) => setNewPlan({ ...newPlan, dailyFreeUnlocks: e.target.value })}
                  placeholder="3"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">TTF倍速</label>
                <input
                  type="number"
                  step="0.1"
                  value={newPlan.ttfMultiplier}
                  onChange={(e) => setNewPlan({ ...newPlan, ttfMultiplier: e.target.value })}
                  placeholder="2"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">订阅券点数</label>
                <input
                  type="number"
                  value={newPlan.voucherPts}
                  onChange={(e) => setNewPlan({ ...newPlan, voucherPts: e.target.value })}
                  placeholder="100"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  价格 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                  placeholder="9.99"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">货币</label>
                <input
                  value={newPlan.currency}
                  onChange={(e) => setNewPlan({ ...newPlan, currency: e.target.value })}
                  placeholder="USD"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={newPlan.active}
                  onChange={(e) => setNewPlan({ ...newPlan, active: e.target.checked })}
                  className="rounded border-emerald-500/20"
                />
                启用此套餐
              </label>
              <button
                onClick={createPlan}
                className="rounded-[12px] bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                创建套餐
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

