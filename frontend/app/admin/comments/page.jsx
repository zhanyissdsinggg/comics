'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';

export default function AdminCommentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // 获取评论列表
  const { data: commentsData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'comments', { searchTerm, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/admin/comments?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const comments = commentsData?.comments || [];

  // 批量删除 mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      const promises = ids.map((id) =>
        fetch(`/api/admin/comments/${id}`, {
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

  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);

  // 过滤和排序
  const filteredComments = useMemo(() => {
    let result = comments ? [...comments] : [];

    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (comment) =>
          comment.id.toString().includes(term) ||
          comment.userId?.toString().includes(term) ||
          (comment.content && comment.content.toLowerCase().includes(term)) ||
          (comment.text && comment.text.toLowerCase().includes(term))
      );
    }

    // 排序
    result.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'createdAt') {
        aVal = new Date(a.createdAt || 0).getTime();
        bVal = new Date(b.createdAt || 0).getTime();
      } else if (sortBy === 'rating') {
        aVal = Number(a.rating) || 0;
        bVal = Number(b.rating) || 0;
      } else if (sortBy === 'userId') {
        aVal = a.userId || '';
        bVal = b.userId || '';
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, searchTerm, sortBy, sortOrder]);

  // 处理批量删除
  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await fetch(`/api/admin/comments/${id}`, {
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

  const getContentPreview = (content) => {
    const text = content || '';
    return text.length > 50 ? `${text.slice(0, 50)}...` : text;
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">评论管理</h1>
          <p className="text-neutral-400 mt-2">管理所有用户评论和反馈</p>
        </div>

        {/* 工具栏 */}
        <div className="mb-6 flex gap-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="搜索评论..."
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

        {/* 评论列表 */}
        {isLoading ? (
          <LoadingState.Spinner size="md" />
        ) : filteredComments.length > 0 ? (
          <div className="rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-900">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredComments.length && filteredComments.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredComments.map((c) => c.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-neutral-400">ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">用户ID</th>
                    <th className="px-4 py-3 text-left text-neutral-400">内容</th>
                    <th className="px-4 py-3 text-left text-neutral-400">评分</th>
                    <th className="px-4 py-3 text-left text-neutral-400">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComments.map((comment) => (
                    <tr key={comment.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(comment.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, comment.id]);
                            } else {
                              setSelectedIds(selectedIds.filter((id) => id !== comment.id));
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-300 font-medium">{comment.id}</td>
                      <td className="px-4 py-3 text-neutral-300">{comment.userId}</td>
                      <td className="px-4 py-3 text-neutral-400 max-w-xs truncate">
                        {getContentPreview(comment.content || comment.text)}
                      </td>
                      <td className="px-4 py-3">
                        {comment.rating ? (
                          <span className="text-yellow-400 font-medium">{comment.rating}★</span>
                        ) : (
                          <span className="text-neutral-500">无</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <LoadingState.EmptyState message="暂无评论" />
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
            <label className="text-sm text-neutral-400">排序字段</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            >
              <option value="createdAt">创建时间</option>
              <option value="rating">评分</option>
              <option value="userId">用户ID</option>
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

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="确认删除"
        message={`确定要删除这 ${selectedIds.length} 条评论吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
