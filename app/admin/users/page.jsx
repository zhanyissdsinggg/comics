'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState('');

  // 获取用户列表
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', { searchTerm, statusFilter, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const users = usersData?.users || [];

  // 批量封禁 mutation
  const bulkBlockMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = ids.map((id) =>
        fetch(`/api/admin/users/${id}/block`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ blocked: true }),
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      setSelectedIds([]);
      setIsBulkActionModalOpen(false);
      refetch();
    },
  });

  // 批量解封 mutation
  const bulkUnblockMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = ids.map((id) =>
        fetch(`/api/admin/users/${id}/block`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ blocked: false }),
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      setSelectedIds([]);
      setIsBulkActionModalOpen(false);
      refetch();
    },
  });

  // 批量删除 mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = ids.map((id) =>
        fetch(`/api/admin/users/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          },
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      setSelectedIds([]);
      setIsDeleteConfirmOpen(false);
      refetch();
    },
  });

  // 单个用户封禁/解封 mutation
  const userBlockMutation = useMutation({
    mutationFn: async ({ userId, blocked }) => {
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blocked }),
      });
      if (!response.ok) throw new Error('更新用户状态失败');
      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleBulkBlock = () => bulkBlockMutation.mutate(selectedIds);
  const handleBulkUnblock = () => bulkUnblockMutation.mutate(selectedIds);
  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);
  const handleUserBlock = (userId, blocked) => userBlockMutation.mutate({ userId, blocked });

  // 过滤和排序
  const filteredUsers = useMemo(() => {
    let result = users ? [...users] : [];

    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.id.toString().includes(term) ||
          (user.email && user.email.toLowerCase().includes(term))
      );
    }

    // 排序
    result.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'createdAt') {
        aVal = new Date(a.createdAt || 0).getTime();
        bVal = new Date(b.createdAt || 0).getTime();
      } else if (sortBy === 'email') {
        aVal = a.email || '';
        bVal = b.email || '';
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchTerm, sortBy, sortOrder]);

  // 处理批量封禁
  const handleBulkBlock = async () => {
    try {
      for (const id of selectedIds) {
        await fetch(`/api/admin/users/${id}/block`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ blocked: true }),
        });
      }

      setSelectedIds([]);
      setIsBulkActionModalOpen(false);
      refetch();
    } catch (error) {
      console.error('批量封禁失败:', error);
    }
  };

  // 处理批量解封
  const handleBulkUnblock = async () => {
    try {
      for (const id of selectedIds) {
        await fetch(`/api/admin/users/${id}/block`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ blocked: false }),
        });
      }

      setSelectedIds([]);
      setIsBulkActionModalOpen(false);
      refetch();
    } catch (error) {
      console.error('批量解封失败:', error);
    }
  };

  // 处理批量删除
  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await fetch(`/api/admin/users/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          },
        });
      }

      setSelectedIds([]);
      setIsDeleteConfirmOpen(false);
      refetch();
    } catch (error) {
      console.error('批量删除失败:', error);
    }
  };

  // 处理单个用户封禁
  const handleUserBlock = async (userId, blocked) => {
    try {
      await fetch(`/api/admin/users/${userId}/block`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blocked }),
      });

      refetch();
    } catch (error) {
      console.error('更新用户状态失败:', error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">用户管理</h1>
          <p className="text-neutral-400 mt-2">管理所有用户、权限和状态</p>
        </div>

        {/* 工具栏 */}
        <div className="mb-6 flex gap-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="搜索用户..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-100 placeholder-neutral-500"
          />

          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700"
          >
            🔍 高级筛选
          </button>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          >
            {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
          </button>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-blue-900/20 border border-blue-700 flex items-center justify-between">
            <span className="text-blue-300">已选择 {selectedIds.length} 项</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBulkActionType('block');
                  setIsBulkActionModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
              >
                封禁
              </button>
              <button
                onClick={() => {
                  setBulkActionType('unblock');
                  setIsBulkActionModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm"
              >
                解封
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
              >
                删除
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 rounded-lg bg-neutral-700 text-neutral-300 hover:bg-neutral-600 text-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 用户列表 */}
        {isLoading ? (
          <LoadingState.Spinner size="md" />
        ) : filteredUsers.length > 0 ? (
          <div className="rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-900">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredUsers.map((u) => u.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-neutral-400">用户ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">邮箱</th>
                    <th className="px-4 py-3 text-left text-neutral-400">注册时间</th>
                    <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                    <th className="px-4 py-3 text-left text-neutral-400">钱包</th>
                    <th className="px-4 py-3 text-left text-neutral-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, user.id]);
                            } else {
                              setSelectedIds(selectedIds.filter((id) => id !== user.id));
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-300 font-medium">{user.id}</td>
                      <td className="px-4 py-3 text-neutral-300">{user.email}</td>
                      <td className="px-4 py-3 text-neutral-400">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.isBlocked
                              ? 'bg-red-900/30 text-red-400'
                              : 'bg-green-900/30 text-green-400'
                          }`}
                        >
                          {user.isBlocked ? '已封禁' : '正常'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-300">
                        <div className="text-xs">
                          <div>付费: {user.wallet?.paidPts || 0}</div>
                          <div>赠送: {user.wallet?.bonusPts || 0}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleUserBlock(user.id, !user.isBlocked)}
                          className={`text-sm ${
                            user.isBlocked
                              ? 'text-green-400 hover:text-green-300'
                              : 'text-red-400 hover:text-red-300'
                          }`}
                        >
                          {user.isBlocked ? '解封' : '封禁'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <LoadingState.EmptyState message="暂无用户" />
        )}
      </div>

      {/* 高级筛选模态框 */}
      <Modal
        isOpen={isFilterModalOpen}
        title="高级筛选"
        onClose={() => setIsFilterModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400">用户状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            >
              <option value="">全部</option>
              <option value="active">正常</option>
              <option value="blocked">已封禁</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-neutral-400">排序字段</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            >
              <option value="createdAt">注册时间</option>
              <option value="email">邮箱</option>
            </select>
          </div>

          <button
            onClick={() => setIsFilterModalOpen(false)}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            应用筛选
          </button>
        </div>
      </Modal>

      {/* 批量操作确认对话框 */}
      <ConfirmDialog
        isOpen={isBulkActionModalOpen}
        title={bulkActionType === 'block' ? '确认封禁' : '确认解封'}
        message={`确定要${bulkActionType === 'block' ? '封禁' : '解封'}这 ${selectedIds.length} 个用户吗？`}
        confirmText={bulkActionType === 'block' ? '封禁' : '解封'}
        cancelText="取消"
        isDangerous={bulkActionType === 'block'}
        onConfirm={bulkActionType === 'block' ? handleBulkBlock : handleBulkUnblock}
        onCancel={() => setIsBulkActionModalOpen(false)}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="确认删除"
        message={`确定要删除这 ${selectedIds.length} 个用户吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
