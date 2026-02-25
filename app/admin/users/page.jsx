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

export default function UsersPage() {
  const { request, error } = useAdminApi();
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchUsers = useCallback(
    async (filters = {}) => {
      setPageLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(filters.page || 1));
        params.append("limit", String(filters.limit || 10));
        if (filters.search) params.append("search", filters.search);
        if (filters.status) params.append("status", filters.status);

        const data = await request(`/api/admin/users?${params.toString()}`);
        const list = parseList(data, ["users"]).map((item) => ({
          ...item,
          id: item.id || item.userId,
        }));
        setUsers(list);
      } catch (err) {
        console.error("获取用户列表失败:", err);
      } finally {
        setPageLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBlock = async (ids) => {
    if (!confirm(`确定要封禁这 ${ids.length} 个用户吗？`)) {
      return;
    }

    setPageLoading(true);
    try {
      for (const id of ids) {
        await request("/api/admin/users/block", {
          method: "PATCH",
          body: JSON.stringify({ userId: id, blocked: true }),
        });
      }
      await fetchUsers();
      setSelectedIds([]);
      alert("封禁成功");
    } catch (err) {
      console.error("封禁失败:", err);
      alert("封禁失败");
    } finally {
      setPageLoading(false);
    }
  };

  const handleUnblock = async (ids) => {
    setPageLoading(true);
    try {
      for (const id of ids) {
        await request("/api/admin/users/block", {
          method: "PATCH",
          body: JSON.stringify({ userId: id, blocked: false }),
        });
      }
      await fetchUsers();
      setSelectedIds([]);
      alert("解封成功");
    } catch (err) {
      console.error("解封失败:", err);
      alert("解封失败");
    } finally {
      setPageLoading(false);
    }
  };

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
      key: "createdAt",
      label: "注册时间",
      render: (value) => (value ? new Date(value).toLocaleDateString("zh-CN") : "-"),
    },
    {
      key: "isBlocked",
      label: "状态",
      render: (value) => (value ? "已封禁" : "正常"),
    },
    {
      key: "wallet",
      label: "钱包",
      render: (value) => {
        const paid = value?.paidPts || 0;
        const bonus = value?.bonusPts || 0;
        return `付费 ${paid} / 赠送 ${bonus}`;
      },
    },
  ];

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
    <AdminLayout title="用户管理" subtitle="用户检索、封禁与批量操作。">
      <div className="space-y-6">
        <AdvancedFilter
          filters={filterOptions}
          onFilter={fetchUsers}
          loading={pageLoading}
        />

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

        <DataTable
          columns={columns}
          data={users}
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
