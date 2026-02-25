"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { DataTable } from "../../../components/admin/DataTable";
import { BulkActions } from "../../../components/admin/BulkActions";
import { AdvancedFilter } from "../../../components/admin/AdvancedFilter";
import { useAdminApi } from "../../../lib/hooks/useAdminApi";

/**
 * 老王注释：优化后的Users管理页面 - 使用新的组件和Hook
 * 这个SB页面简洁多了，因为把复杂逻辑都提取到组件和Hook里了
 */
export default function UsersPage() {
  const { request, loading, error } = useAdminApi();
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  // 老王说：初始化加载
  useEffect(() => {
    const fetchUsers = async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", filters.page || 1);
        params.append("limit", filters.limit || 10);
        if (filters.search) params.append("search", filters.search);

        const data = await request(`/api/admin/users?${params.toString()}`);
        setUsers(data.data || []);
      } catch (err) {
        console.error("获取用户列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchUsers();
  }, [request]);

  // 老王说：处理封禁用户
  const handleBlock = async (ids) => {
    if (!confirm(`确定要封禁这 ${ids.length} 个用户吗？`)) {
      return;
    }

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/users/${id}/block`, {
          method: "PATCH",
          body: JSON.stringify({ blocked: true }),
        });
      }
      fetchUsers();
      setSelectedIds([]);
      alert("封禁成功");
    } catch (err) {
      console.error("封禁失败:", err);
      alert("封禁失败");
    } finally {
      setPageLoading(false);
    }
  };

  // 老王说：处理解禁用户
  const handleUnblock = async (ids) => {
    setPageLoading(true);
    try {
      for (const id of ids) {
        await request(`/api/admin/users/${id}/block`, {
          method: "PATCH",
          body: JSON.stringify({ blocked: false }),
        });
      }
      fetchUsers();
      setSelectedIds([]);
      alert("解禁成功");
    } catch (err) {
      console.error("解禁失败:", err);
      alert("解禁失败");
    } finally {
      setPageLoading(false);
    }
  };

  // 老王说：表格列定义
  const columns = [
    {
      key: "id",
      label: "用户ID",
      sortable: true,
    },
    {
      key: "email",
      label: "邮箱",
      sortable: true,
    },
    {
      key: "username",
      label: "用户名",
      sortable: true,
    },
    {
      key: "createdAt",
      label: "注册时间",
      render: (value) => new Date(value).toLocaleDateString("zh-CN"),
    },
    {
      key: "blocked",
      label: "状态",
      render: (value) => (value ? "已封禁" : "正常"),
    },
    {
      key: "wallet",
      label: "钱包余额",
      render: (value) => `¥${(value / 100).toFixed(2)}`,
    },
  ];

  // 老王说：高级过滤选项
  const filterOptions = [
    {
      id: "status",
      label: "用户状态",
      type: "select",
      options: [
        { label: "正常", value: "active" },
        { label: "已封禁", value: "blocked" },
      ],
    },
    {
      id: "createdAt",
      label: "注册时间",
      type: "dateRange",
    },
  ];

  return (
    <AdminLayout title="用户管理">
      <div className="space-y-6">
        {/* 老王说：高级搜索过滤 */}
        <AdvancedFilter
          filters={filterOptions}
          onFilter={(filters) => fetchUsers(filters)}
          loading={pageLoading}
        />

        {/* 老王说：批量操作工具栏 */}
        <BulkActions
          selectedIds={selectedIds}
          onUpdate={handleUnblock}
          loading={pageLoading}
          actions={[
            {
              id: "block",
              label: "封禁",
              icon: "🚫",
              handler: handleBlock,
              className: "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20",
            },
          ]}
        />

        {/* 老王说：数据表格 */}
        <DataTable
          columns={columns}
          data={users}
          loading={pageLoading}
          error={error}
          selectable={true}
          onSelectionChange={setSelectedIds}
          sortable={true}
          paginated={true}
          pageSize={10}
          onRowClick={(row) => {
            // 老王说：点击行跳转到用户详情页
            window.location.href = `/admin/users/${row.id}`;
          }}
        />
      </div>
    </AdminLayout>
  );
}
