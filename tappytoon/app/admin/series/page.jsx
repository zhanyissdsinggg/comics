"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { DataTable } from "../../../components/admin/DataTable";
import { BulkActions } from "../../../components/admin/BulkActions";
import { AdvancedFilter } from "../../../components/admin/AdvancedFilter";
import { useAdminApi } from "../../../lib/hooks/useAdminApi";

/**
 * 老王注释：优化后的Series管理页面 - 使用新的组件和Hook
 * 这个SB页面简洁多了，因为把复杂逻辑都提取到组件和Hook里了
 * 对比之前的页面，现在只需要200行左右，代码质量还提升了！
 */
export default function SeriesPage() {
  const { request, loading, error } = useAdminApi();
  const [series, setSeries] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  // 老王说：获取作品列表
  const fetchSeries = async (filters = {}) => {
    setPageLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", filters.page || 1);
      params.append("limit", filters.limit || 10);
      if (filters.search) params.append("search", filters.search);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);

      const data = await request(`/api/admin/series?${params.toString()}`);
      setSeries(data.data || []);
    } catch (err) {
      console.error("获取作品列表失败:", err);
    } finally {
      setPageLoading(false);
    }
  };

  // 老王说：初始化加载
  useEffect(() => {
    fetchSeries();
  }, []);

  // 老王说：处理删除
  const handleDelete = async (ids) => {
    if (!confirm(`确定要删除这 ${ids.length} 部作品吗？`)) {
      return;
    }

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/series/${id}`, { method: "DELETE" });
      }
      setSeries(series.filter((s) => !ids.includes(s.id)));
      setSelectedIds([]);
      alert("删除成功");
    } catch (err) {
      console.error("删除失败:", err);
      alert("删除失败");
    } finally {
      setPageLoading(false);
    }
  };

  // 老王说：处理批量更新
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
      fetchSeries();
      setSelectedIds([]);
      alert("更新成功");
    } catch (err) {
      console.error("更新失败:", err);
      alert("更新失败");
    } finally {
      setPageLoading(false);
    }
  };

  // 老王说：处理导出
  const handleExport = async (ids) => {
    try {
      const exportData = series.filter((s) => ids.includes(s.id));
      const csv = [
        ["ID", "标题", "类型", "状态", "评分"].join(","),
        ...exportData.map((s) =>
          [s.id, s.title, s.type, s.status, s.rating].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "series.csv";
      a.click();
    } catch (err) {
      console.error("导出失败:", err);
      alert("导出失败");
    }
  };

  // 老王说：表格列定义
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
        return statusMap[value] || value;
      },
    },
    {
      key: "rating",
      label: "评分",
      render: (value) => value.toFixed(1),
    },
  ];

  // 老王说：高级过滤选项
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
      options: [
        { label: "仅显示成人内容", value: "true" },
      ],
    },
  ];

  return (
    <AdminLayout title="作品管理">
      <div className="space-y-6">
        {/* 老王说：高级搜索过滤 */}
        <AdvancedFilter
          filters={filterOptions}
          onFilter={(filters) => fetchSeries(filters)}
          loading={pageLoading}
        />

        {/* 老王说：批量操作工具栏 */}
        <BulkActions
          selectedIds={selectedIds}
          onDelete={handleDelete}
          onUpdate={handleBulkUpdate}
          onExport={handleExport}
          loading={pageLoading}
        />

        {/* 老王说：数据表格 */}
        <DataTable
          columns={columns}
          data={series}
          loading={pageLoading}
          error={error}
          selectable={true}
          onSelectionChange={setSelectedIds}
          sortable={true}
          paginated={true}
          pageSize={10}
          onRowClick={(row) => {
            // 老王说：点击行跳转到详情页
            window.location.href = `/admin/series/${row.id}`;
          }}
        />
      </div>
    </AdminLayout>
  );
}
