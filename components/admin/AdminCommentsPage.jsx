"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "./AdminShell";
import { apiGet, apiPatch } from "../../lib/apiClient";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

export default function AdminCommentsPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const isAuthorized = key === ADMIN_KEY;
  const [comments, setComments] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadComments = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/comments?key=${key}`);
    if (response.ok) {
      setComments(response.data?.comments || []);
    }
    setLoading(false);
  }, [key]);

  useEffect(() => {
    if (isAuthorized) {
      loadComments();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, loadComments]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return comments;
    }
    return comments.filter((item) =>
      `${item.seriesId} ${item.text}`.toLowerCase().includes(normalized)
    );
  }, [comments, query]);

  const toggleHidden = async (comment) => {
    await apiPatch("/api/admin/comments/hide", {
      key,
      seriesId: comment.seriesId,
      commentId: comment.id,
      hidden: !comment.hidden,
    });
    loadComments();
  };

  const recalcRating = async (seriesId) => {
    await apiPatch("/api/admin/comments/recalc-rating", { key, seriesId });
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
    <AdminShell title="评论管理" subtitle="屏蔽评论 / 重算评分">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索作品ID或评论内容"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
            >
              清除
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">评论列表</h3>
            {loading ? <span className="text-xs text-slate-400">加载中...</span> : null}
          </div>
          <div className="space-y-3">
            {filtered.map((comment) => (
              <div
                key={comment.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {comment.seriesId}
                    </p>
                    <p className="text-xs text-slate-500">
                      {comment.author || comment.userId} · {comment.createdAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => recalcRating(comment.seriesId)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                    >
                      重算评分
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleHidden(comment)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                    >
                      {comment.hidden ? "取消屏蔽" : "屏蔽"}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{comment.text}</p>
                {comment.hidden ? (
                  <span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
                    已屏蔽
                  </span>
                ) : null}
              </div>
            ))}
            {!loading && filtered.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                暂无评论
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
