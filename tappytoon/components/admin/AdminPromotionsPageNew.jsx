"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../lib/apiClient";
import {
  Search,
  RefreshCw,
  Gift,
  Calendar,
  Users,
  Edit,
  Trash2,
  Play,
  Pause,
  Plus,
  X,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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
  priority: 0,
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

export default function AdminPromotionsPageNew() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [query, setQuery] = useState("");
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

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/promotions`);
    if (response.ok) {
      // 老王修复：过滤掉null/undefined元素，防止访问null.priority等属性报错
      const list = (response.data?.promotions || []).filter(Boolean);
      list.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
      setPromotions(list);
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
    // 老王添加：基础验证
    if (!form.id || !form.title) {
      showStatus("error", "请填写活动ID和标题");
      return;
    }

    // 老王添加：日期范围验证
    if (form.startAt && form.endAt) {
      const startTime = new Date(form.startAt).getTime();
      const endTime = new Date(form.endAt).getTime();
      if (startTime >= endTime) {
        showStatus("error", "开始时间必须早于结束时间");
        return;
      }
    }

    // 老王添加：数值范围验证
    const bonusMultiplier = Number(form.bonusMultiplier);
    if (bonusMultiplier < 0 || bonusMultiplier > 10) {
      showStatus("error", "奖励倍数必须在0-10之间");
      return;
    }

    const priority = Number(form.priority);
    if (priority < 0 || priority > 100) {
      showStatus("error", "优先级必须在0-100之间");
      return;
    }

    const response = editingId
      ? await apiPatch(`/api/admin/promotions/${editingId}`, { promotion: form })
      : await apiPost("/api/admin/promotions", { promotion: form });

    if (response.ok) {
      showStatus("success", `${editingId ? "更新" : "创建"}成功`);
      setForm(defaultForm);
      setEditingId("");
      loadPromotions();
    } else {
      showStatus("error", `操作失败：${response.error || "未知错误"}`);
    }
  };

  const handleEdit = (promo) => {
    setForm({
      ...defaultForm,
      ...promo,
    });
    setEditingId(promo.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (promoId) => {
    const response = await apiDelete(`/api/admin/promotions/${promoId}`);
    if (response.ok) {
      showStatus("success", "删除成功");
      loadPromotions();
    } else {
      showStatus("error", `删除失败：${response.error || "未知错误"}`);
    }
  };

  const toggleActive = async (promo) => {
    const response = await apiPatch(`/api/admin/promotions/${promo.id}`, {
      promotion: { ...promo, active: !promo.active },
    });

    if (response.ok) {
      showStatus("success", `${promo.active ? "暂停" : "启用"}成功`);
      loadPromotions();
    } else {
      showStatus("error", `操作失败：${response.error || "未知错误"}`);
    }
  };

  const filteredPromotions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return promotions;
    return promotions.filter(
      (promo) =>
        `${promo.id} ${promo.title} ${promo.description}`
          .toLowerCase()
          .includes(normalized)
    );
  }, [promotions, query]);

  const stats = useMemo(() => {
    const now = new Date();
    const total = promotions.length;
    const active = promotions.filter((p) => p.active).length;
    const ongoing = promotions.filter((p) => {
      if (!p.active) return false;
      const start = p.startAt ? new Date(p.startAt) : null;
      const end = p.endAt ? new Date(p.endAt) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    }).length;
    const upcoming = promotions.filter((p) => {
      if (!p.active) return false;
      const start = p.startAt ? new Date(p.startAt) : null;
      return start && now < start;
    }).length;
    return { total, active, ongoing, upcoming };
  }, [promotions]);

  const getPromoStatus = (promo) => {
    if (!promo.active) return { label: "已暂停", color: "slate", icon: Pause };
    const now = new Date();
    const start = promo.startAt ? new Date(promo.startAt) : null;
    const end = promo.endAt ? new Date(promo.endAt) : null;

    if (start && now < start) {
      return { label: "未开始", color: "amber", icon: Clock };
    }
    if (end && now > end) {
      return { label: "已结束", color: "red", icon: XCircle };
    }
    return { label: "进行中", color: "emerald", icon: CheckCircle };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div>
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

        {/* 统计信息 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400">总活动数</p>
                <p className="mt-1 text-2xl font-bold text-neutral-100">{stats.total}</p>
              </div>
              <div className="rounded-[12px] bg-emerald-50 p-3">
                <Gift className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400">进行中</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.ongoing}</p>
              </div>
              <div className="rounded-[12px] bg-emerald-50 p-3">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400">待开始</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{stats.upcoming}</p>
              </div>
              <div className="rounded-[12px] bg-amber-50 p-3">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400">已启用</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.active}</p>
              </div>
              <div className="rounded-[12px] bg-emerald-50 p-3">
                <Play className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 创建/编辑表单 */}
        <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-100">
              {editingId ? (
                <span className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-emerald-600" />
                  编辑活动
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-600" />
                  创建活动
                </span>
              )}
            </h3>
            {editingId && (
              <button
                onClick={() => {
                  setForm(defaultForm);
                  setEditingId("");
                }}
                className="flex items-center gap-1 rounded-[12px] border border-slate-200 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                取消编辑
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* 基础信息 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  活动ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.id}
                  onChange={(e) => setForm((prev) => ({ ...prev, id: e.target.value }))}
                  placeholder="例如: spring-festival-2024"
                  disabled={Boolean(editingId)}
                  className="w-full rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  活动标题 <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="例如: 春节特惠活动"
                  className="w-full rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  活动描述
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="活动详细说明..."
                  rows={2}
                  className="w-full rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  活动类型
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="FIRST_PURCHASE">首充</option>
                  <option value="HOLIDAY">节日</option>
                  <option value="RETURNING">回流</option>
                  <option value="SUB_VOUCHER">订阅券</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  目标用户
                </label>
                <select
                  value={form.segment}
                  onChange={(e) => setForm((prev) => ({ ...prev, segment: e.target.value }))}
                  className="w-full rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">全部用户</option>
                  <option value="first_purchase">首充用户</option>
                  <option value="returning">回流用户</option>
                  <option value="subscriber">订阅用户</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  开始时间
                </label>
                <input
                  type="datetime-local"
                  value={form.startAt ? form.startAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      startAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                    }))
                  }
                  className="w-full rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  结束时间
                </label>
                <input
                  type="datetime-local"
                  value={form.endAt ? form.endAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      endAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                    }))
                  }
                  className="w-full rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, active: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  启用活动
                </label>
              </div>
            </div>

            {/* 高级设置（折叠） */}
            <div className="border-t border-slate-200 pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-emerald-600"
              >
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                高级设置
              </button>

              {showAdvanced && (
                <div className="mt-4 grid gap-4 rounded-[12px] bg-slate-50 p-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      奖励倍数
                    </label>
                    <input
                      type="number"
                      value={form.bonusMultiplier}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          bonusMultiplier: Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      className="w-full rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      优先级
                    </label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, priority: Number(e.target.value) }))
                      }
                      placeholder="0"
                      className="w-full rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <p className="mt-1 text-xs text-neutral-400">数字越大优先级越高</p>
                  </div>
                </div>
              )}
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 rounded-[12px] bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                {editingId ? (
                  <>
                    <Edit className="h-4 w-4" />
                    更新活动
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    创建活动
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 搜索和刷新 */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索活动ID、标题或描述"
              className="w-full rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl pl-10 pr-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <button
            onClick={loadPromotions}
            disabled={loading}
            className="rounded-[12px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* 活动列表 */}
        {loading ? (
          <div className="flex items-center justify-center rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-12">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-12">
            <Gift className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm text-neutral-400">暂无活动数据</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPromotions.map((promo) => {
              const status = getPromoStatus(promo);
              const StatusIcon = status.icon;
              return (
                <div
                  key={promo.id}
                  className="group rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* 活动信息 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-emerald-600" />
                        <h4 className="text-base font-semibold text-neutral-100">
                          {promo.title}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            status.color === "emerald"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : status.color === "amber"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : status.color === "red"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {TYPE_LABELS[promo.type] || promo.type}
                        </span>
                        <span>·</span>
                        <span>{SEGMENT_LABELS[promo.segment] || promo.segment}</span>
                        {promo.startAt && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(promo.startAt)}
                            </span>
                          </>
                        )}
                        {promo.endAt && (
                          <>
                            <span>→</span>
                            <span>{formatDate(promo.endAt)}</span>
                          </>
                        )}
                      </div>

                      {promo.description && (
                        <p className="mt-2 text-sm text-neutral-300">{promo.description}</p>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleActive(promo)}
                        className={`flex items-center gap-1 rounded-[12px] border px-3 py-1.5 text-xs font-medium transition-colors ${
                          promo.active
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {promo.active ? (
                          <>
                            <Pause className="h-3 w-3" />
                            暂停
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            启用
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleEdit(promo)}
                        className="flex items-center gap-1 rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <Edit className="h-3 w-3" />
                        编辑
                      </button>

                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="flex items-center gap-1 rounded-[12px] border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
