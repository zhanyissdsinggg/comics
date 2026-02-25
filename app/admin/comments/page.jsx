"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { DataTable } from "../../../components/admin/DataTable";
import { BulkActions } from "../../../components/admin/BulkActions";
import { AdvancedFilter } from "../../../components/admin/AdvancedFilter";
import { useAdminApi } from "../../../lib/hooks/useAdminApi";

function parseList(payload, keys = []) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
}

export default function CommentsPage() {
  const { request, error } = useAdminApi();
  const [comments, setComments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchComments = useCallback(
    async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(filters.page || 1));
        params.append("limit", String(filters.limit || 10));
        if (filters.search) params.append("search", filters.search);

        const data = await request(`/api/admin/comments?${params.toString()}`);
        const list = parseList(data, ["comments"]).map((item) => ({
          ...item,
          id: item.id || item.commentId,
        }));
        setComments(list);
      } catch (err) {
        console.error("获取评论列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleDelete = async (ids) => {
    if (!confirm(`确定要删除这 ${ids.length} 条评论吗？`)) return;

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/comments/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      await fetchComments();
      alert("删除成功");
    } catch (err) {
      console.error("删除失败:", err);
      alert("删除失败");
    } finally {
      setPageLoading(false);
    }
  };

  const columns = [
    { key: "id", label: "ID", sortable: true },
    { key: "userId", label: "用户ID", sortable: true },
    {
      key: "content",
      label: "内容",
      render: (v, row) => {
        const text = v || row.text || "";
        return text.length > 50 ? `${text.slice(0, 50)}...` : text;
      },
    },
    {
      key: "rating",
      label: "评分",
      render: (v) => (v ? `${v}★` : "无"),
    },
    {
      key: "createdAt",
      label: "创建时间",
      render: (v) => (v ? new Date(v).toLocaleDateString("zh-CN") : "-"),
    },
  ];

  return (
    <AdminLayout title="评论管理" subtitle="评论检索与删除。">
      <div className="space-y-6">
        <AdvancedFilter filters={[]} onFilter={fetchComments} loading={pageLoading} />

        <BulkActions
          selectedIds={selectedIds}
          onDelete={handleDelete}
          loading={pageLoading}
        />

        <DataTable
          columns={columns}
          data={comments}
          loading={pageLoading}
          error={error}
          selectable
          onSelectionChange={setSelectedIds}
          sortable
          paginated
          pageSize={10}
        />
      </div>
    </AdminLayout>
  );
}
