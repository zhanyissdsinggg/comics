"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AdminShell from "./AdminShell";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../lib/apiClient";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

const TYPE_TABS = [
  { label: "全部", value: "all" },
  { label: "漫画", value: "comic" },
  { label: "小说", value: "novel" },
];

const STATUS_OPTIONS = ["Ongoing", "Completed", "Hiatus"];

function getTypeLabel(type) {
  return type === "novel" ? "小说" : "漫画";
}

function getStatusLabel(status) {
  if (status === "Completed") {
    return "已完结";
  }
  if (status === "Hiatus") {
    return "暂停";
  }
  return "连载中";
}

function getStatusTone(status) {
  if (status === "Completed") {
    return "bg-blue-50 text-blue-600";
  }
  if (status === "Hiatus") {
    return "bg-amber-50 text-amber-600";
  }
  return "bg-emerald-50 text-emerald-600";
}

export default function AdminPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const key = searchParams.get("key") || "";
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [adultFilter, setAdultFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("title");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selectedMap, setSelectedMap] = useState({});
  const [form, setForm] = useState({
    id: "",
    title: "",
    type: "comic",
    adult: false,
  });

  const isAuthorized = key === ADMIN_KEY;

  const loadSeries = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/series?key=${key}`);
    if (response.ok) {
      setSeriesList(response.data?.series || []);
    }
    setLoading(false);
  }, [key]);

  useEffect(() => {
    if (isAuthorized) {
      loadSeries();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, loadSeries]);

  const handleCreate = async () => {
    if (!form.id) {
      return;
    }
    const response = await apiPost("/api/admin/series", {
      key,
      series: {
        ...form,
        adult: Boolean(form.adult),
        genres: [],
        pricing: { currency: "POINTS", episodePrice: 5, discount: 0 },
        ttf: { enabled: true, intervalHours: 24 },
        isPublished: true,
        isFeatured: false,
      },
    });
    if (response.ok) {
      setForm({ id: "", title: "", type: "comic", adult: false });
      loadSeries();
    }
  };

  const handleDelete = async (seriesId) => {
    await apiDelete(`/api/admin/series/${seriesId}?key=${key}`);
    loadSeries();
  };

  const updateSeries = async (seriesId, changes) => {
    const target = seriesList.find((item) => item.id === seriesId);
    if (!target) {
      return;
    }
    const response = await apiPatch(`/api/admin/series/${seriesId}`, {
      key,
      series: { ...target, ...changes },
    });
    if (response.ok) {
      loadSeries();
    }
  };

  const handleDuplicate = async (seriesId) => {
    const target = seriesList.find((item) => item.id === seriesId);
    if (!target) {
      return;
    }
    const nextId = window.prompt("请输入新作品 ID", `${seriesId}_copy`);
    if (!nextId) {
      return;
    }
    const response = await apiPost("/api/admin/series", {
      key,
      series: {
        ...target,
        id: nextId,
        title: `${target.title}（复制）`,
      },
    });
    if (response.ok) {
      loadSeries();
    }
  };

  const filteredList = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let list = [...seriesList];
    if (typeFilter !== "all") {
      list = list.filter((item) => item.type === typeFilter);
    }
    if (adultFilter !== "all") {
      const isAdult = adultFilter === "adult";
      list = list.filter((item) => Boolean(item.adult) === isAdult);
    }
    if (statusFilter !== "all") {
      list = list.filter((item) => (item.status || "Ongoing") === statusFilter);
    }
    if (normalizedQuery) {
      list = list.filter((item) =>
        `${item.id} ${item.title}`.toLowerCase().includes(normalizedQuery)
      );
    }
    list.sort((a, b) => {
      const aValue = (a[sortKey] || "").toString().toLowerCase();
      const bValue = (b[sortKey] || "").toString().toLowerCase();
      if (aValue === bValue) {
        return 0;
      }
      const order = aValue > bValue ? 1 : -1;
      return sortDir === "asc" ? order : -order;
    });
    return list;
  }, [seriesList, typeFilter, adultFilter, statusFilter, query, sortKey, sortDir]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const total = seriesList.length;
    const comics = seriesList.filter((item) => item.type !== "novel").length;
    const novels = seriesList.filter((item) => item.type === "novel").length;
    const adult = seriesList.filter((item) => Boolean(item.adult)).length;
    return { total, comics, novels, adult };
  }, [seriesList]);

  const toggleSort = (keyValue) => {
    if (sortKey === keyValue) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(keyValue);
    setSortDir("asc");
  };

  const selectedIds = useMemo(
    () => Object.keys(selectedMap).filter((id) => selectedMap[id]),
    [selectedMap]
  );

  const toggleSelectAll = (checked) => {
    const next = {};
    if (checked) {
      pagedList.forEach((item) => {
        next[item.id] = true;
      });
    }
    setSelectedMap(next);
  };

  const applyBulkSeries = async (changes) => {
    if (selectedIds.length === 0) {
      return;
    }
    for (const id of selectedIds) {
      await updateSeries(id, changes);
    }
    setSelectedMap({});
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
    <AdminShell
      title="作品管理"
      subtitle="管理作品、章节与基础配置"
      actions={
        <button
          type="button"
          onClick={() => router.push(`/admin/promotions?key=${key}`)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
        >
          活动配置
        </button>
      }
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold">作品总览</h2>
          <p className="mt-1 text-sm text-slate-500">新建作品、进入编辑或章节管理。</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">作品总数</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">漫画</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.comics}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">小说</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.novels}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">成人向</p>
              <p className="text-2xl font-semibold text-slate-900">{stats.adult}</p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold">创建作品</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <input
              value={form.id}
              onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
              placeholder="作品 ID"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="作品标题"
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
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            创建
          </button>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">作品列表</h3>
              {loading ? <span className="text-xs text-slate-400">加载中...</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setTypeFilter(tab.value)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    typeFilter === tab.value
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 text-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-4">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索 ID 或作品标题"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <select
                value={adultFilter}
                onChange={(event) => setAdultFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">全部年龄</option>
                <option value="adult">成人向</option>
                <option value="safe">全年龄</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">全部状态</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setAdultFilter("all");
                    setStatusFilter("all");
                  }}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
                >
                  重置
                </button>
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  className="rounded-full bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  搜索
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span>批量操作（已选 {selectedIds.length}）</span>
              <button
                type="button"
                onClick={() => applyBulkSeries({ isPublished: true })}
                className="rounded-full border border-slate-200 px-3 py-1"
              >
                上架
              </button>
              <button
                type="button"
                onClick={() => applyBulkSeries({ isPublished: false })}
                className="rounded-full border border-slate-200 px-3 py-1"
              >
                下架
              </button>
              <button
                type="button"
                onClick={() => applyBulkSeries({ isFeatured: true })}
                className="rounded-full border border-slate-200 px-3 py-1"
              >
                推荐
              </button>
              <button
                type="button"
                onClick={() => applyBulkSeries({ isFeatured: false })}
                className="rounded-full border border-slate-200 px-3 py-1"
              >
                取消推荐
              </button>
              <button
                type="button"
                onClick={() => applyBulkSeries({ adult: true })}
                className="rounded-full border border-slate-200 px-3 py-1"
              >
                标记成人向
              </button>
              <button
                type="button"
                onClick={() => applyBulkSeries({ adult: false })}
                className="rounded-full border border-slate-200 px-3 py-1"
              >
                取消成人向
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={pagedList.length > 0 && pagedList.every((item) => selectedMap[item.id])}
                      onChange={(event) => toggleSelectAll(event.target.checked)}
                    />
                  </th>
                  <th className="px-4 py-3 w-24">
                    <button type="button" onClick={() => toggleSort("id")}>
                      ID
                    </button>
                  </th>
                  <th className="px-4 py-3 w-28">封面</th>
                  <th className="px-4 py-3">
                    <button type="button" onClick={() => toggleSort("title")}>
                      作品名称
                    </button>
                  </th>
                  <th className="px-4 py-3 w-28">类型</th>
                  <th className="px-4 py-3">分类</th>
                  <th className="px-4 py-3 w-24">状态</th>
                  <th className="px-4 py-3 w-40 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedMap[item.id])}
                        onChange={(event) =>
                          setSelectedMap((prev) => ({ ...prev, [item.id]: event.target.checked }))
                        }
                      />
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.id}</td>
                    <td className="px-4 py-4">
                      <div className="h-20 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {item.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                            无封面
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600">
                          {item.adult ? "成人向" : "全年龄"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            item.isPublished === false
                              ? "bg-slate-100 text-slate-500"
                              : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {item.isPublished === false ? "已下架" : "已上架"}
                        </span>
                        {item.isFeatured ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">
                            推荐
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                        {getTypeLabel(item.type)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {(item.genres || []).length > 0 ? (
                          item.genres.map((genre) => (
                            <span
                              key={genre}
                              className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500"
                            >
                              {genre}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">未设置</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${getStatusTone(
                          item.status || "Ongoing"
                        )}`}
                      >
                        {getStatusLabel(item.status || "Ongoing")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => router.push(`/series/${item.id}`)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-slate-600"
                        >
                          查看
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/admin/series/${item.id}?key=${key}`)
                          }
                          className="rounded-full border border-slate-200 px-3 py-1 text-slate-600"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/admin/series/${item.id}/episodes?key=${key}`)
                          }
                          className="rounded-full border border-slate-200 px-3 py-1 text-slate-600"
                        >
                          章节
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSeries(item.id, { isPublished: !item.isPublished })}
                          className="rounded-full border border-slate-200 px-3 py-1 text-slate-600"
                        >
                          {item.isPublished === false ? "上架" : "下架"}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSeries(item.id, { isFeatured: !item.isFeatured })}
                          className="rounded-full border border-slate-200 px-3 py-1 text-slate-600"
                        >
                          {item.isFeatured ? "取消推荐" : "推荐"}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSeries(item.id, { adult: !item.adult })}
                          className="rounded-full border border-slate-200 px-3 py-1 text-slate-600"
                        >
                          {item.adult ? "取消成人" : "标记成人"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(item.id)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-slate-600"
                        >
                          复制
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="rounded-full border border-red-200 px-3 py-1 text-red-600"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pagedList.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-slate-400" colSpan={8}>
                      暂无作品
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              共 {filteredList.length} 条，当前第 {page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                disabled={page <= 1}
              >
                上一页
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                disabled={page >= totalPages}
              >
                下一页
              </button>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
