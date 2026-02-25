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

export default function SeriesPage() {
  const { request, error } = useAdminApi();
  const [series, setSeries] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchSeries = useCallback(
    async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(filters.page || 1));
        params.append("limit", String(filters.limit || 10));
        if (filters.search) params.append("search", filters.search);
        if (filters.sortBy) params.append("sortBy", filters.sortBy);
        if (filters.type) params.append("type", filters.type);
        if (filters.status) params.append("status", filters.status);

        const data = await request(`/api/admin/series?${params.toString()}`);
        const list = parseList(data, ["series"]).map((item) => ({
          ...item,
          id: item.id || item.seriesId,
        }));
        setSeries(list);
      } catch (err) {
        console.error("获取作品列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const handleDelete = async (ids) => {
    if (!confirm(`确定要删除这 ${ids.length} 部作品吗？`)) {
      return;
    }

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/series/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      await fetchSeries();
      alert("删除成功");
    } catch (err) {
      console.error("删除失败:", err);
      alert("删除失败");
    } finally {
      setPageLoading(false);
    }
  };

  const handleBulkUpdate = async (ids) => {
    const status = prompt("请输入新的状态 (Ongoing/Completed/Hiatus):");
    if (!status) return;

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/series/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ series: { status } }),
        });
      }
      setSelectedIds([]);
      await fetchSeries();
      alert("更新成功");
    } catch (err) {
      console.error("更新失败:", err);
      alert("更新失败");
    } finally {
      setPageLoading(false);
    }
  };

  const handleExport = async (ids) => {
    try {
      const exportData = series.filter((s) => ids.includes(s.id));
      const csv = [
        ["ID", "标题", "类型", "状态", "评分"].join(","),
        ...exportData.map((s) =>
          [
            s.id,
            s.title,
            s.type,
            s.status,
            Number(s.rating || 0).toFixed(1),
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "series.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("导出失败:", err);
      alert("导出失败");
    }
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
    },
    {
      key: "title",
      label: "标题",
      sortable: true,
    },
    {
      key: "type",
      label: "类型",
      render: (value) => (value === "comic" ? "漫画" : "小说"),
    },
    {
      key: "status",
      label: "状态",
      render: (value) => {
        const statusMap = {
          Ongoing: "连载中",
          Completed: "已完结",
          Hiatus: "暂停",
        };
        return statusMap[value] || value || "-";
      },
    },
    {
      key: "rating",
      label: "评分",
      render: (value) => Number(value || 0).toFixed(1),
    },
  ];

  const filterOptions = [
    {
      id: "type",
      label: "类型",
      type: "select",
      options: [
        { label: "漫画", value: "comic" },
        { label: "小说", value: "novel" },
      ],
    },
    {
      id: "status",
      label: "状态",
      type: "select",
      options: [
        { label: "连载中", value: "Ongoing" },
        { label: "已完结", value: "Completed" },
        { label: "暂停", value: "Hiatus" },
      ],
    },
    {
      id: "adult",
      label: "内容分级",
      type: "checkbox",
      options: [{ label: "仅显示成人内容", value: "true" }],
    },
  ];

  return (
    <AdminLayout title="作品管理" subtitle="作品筛选、状态变更与批量操作。">
      <div className="space-y-6">
        <AdvancedFilter
          filters={filterOptions}
          onFilter={fetchSeries}
          loading={pageLoading}
        />

        <BulkActions
          selectedIds={selectedIds}
          onDelete={handleDelete}
          onUpdate={handleBulkUpdate}
          onExport={handleExport}
          loading={pageLoading}
        />

        <DataTable
          columns={columns}
          data={series}
          loading={pageLoading}
          error={error}
          selectable
          onSelectionChange={setSelectedIds}
          sortable
          paginated
          pageSize={10}
          onRowClick={(row) => {
            window.location.href = `/admin/series/${row.id}`;
          }}
        />
      </div>
    </AdminLayout>
  );
}
