"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import AdminShell from "./AdminShell";
import { apiGet, apiPatch } from "../../lib/apiClient";

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // 老王说：检查认证状态，未登录则重定向
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/users`);
    if (response.ok) {
      setUsers(response.data?.users || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadUsers]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return users;
    }
    return users.filter((user) =>
      `${user.id} ${user.email}`.toLowerCase().includes(normalized)
    );
  }, [users, query]);

  const toggleBlock = async (user) => {
    await apiPatch("/api/admin/users/block", {
      key,
      userId: user.id,
      blocked: !user.isBlocked,
    });
    loadUsers();
  };

  // 老王说：如果正在加载或未认证，显示加载状态
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AdminShell title="用户管理" subtitle="账号与钱包信息">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索用户ID或邮箱"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">用户ID</th>
                <th className="px-4 py-3">邮箱</th>
                <th className="px-4 py-3">钱包</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 text-slate-700">{user.id}</td>
                  <td className="px-4 py-3 text-slate-500">{user.email}</td>
                  <td className="px-4 py-3 text-slate-500">
                    Paid {user.wallet?.paidPts || 0} · Bonus {user.wallet?.bonusPts || 0}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {user.isBlocked ? "已封禁" : "正常"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleBlock(user)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                    >
                      {user.isBlocked ? "解封" : "封禁"}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={5}>
                    暂无用户
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
