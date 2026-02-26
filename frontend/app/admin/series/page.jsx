'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useMemo } from 'react';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';
import { useAdminList } from '@/lib/hooks/useAdminList';
import { useBulkMutation } from '@/lib/hooks/useBulkMutation';

// 定义可搜索的字段
const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'title', type: 'string' },
];

// 定义可排序的字段
const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'rating', type: 'number' },
  { field: 'title', type: 'string' },
];

export default function AdminSeriesPage() {
  const [viewMode, setViewMode] = useState('list'); // list, grid
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [bulkActionData, setBulkActionData] = useState({});
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAdult, setFilterAdult] = useState(false);

  // 用 useAdminList Hook 替代所有搜索、排序、筛选逻辑
  const {
    items: series,
    isLoading,
    refetch,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    setFilter,
  } = useAdminList('series', searchFields, sortFields, 'createdAt', 'desc');

  // 性能优化：用 Set 替代 includes() 查询
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // 用 useBulkMutation Hook 替代 bulkDeleteMutation
  const bulkDeleteMutation = useBulkMutation(
    {
      endpoint: 'series',
      method: 'DELETE',
    },
    {
      onSuccess: () => {
        clearSelection();
        setIsDeleteConfirmOpen(false);
        refetch();
      },
      onError: (error) => {
        alert(`删除失败: ${error.message}`);
      },
    }
  );

  // 用 useBulkMutation Hook 替代 bulkUpdateStatusMutation
  const bulkUpdateStatusMutation = useBulkMutation(
    {
      endpoint: 'series',
      method: 'PATCH',
      bodyBuilder: () => ({ status: bulkActionData.status }),
    },
    {
      onSuccess: () => {
        clearSelection();
        setIsBulkActionModalOpen(false);
        setBulkActionData({});
        refetch();
      },
      onError: (error) => {
        alert(`更新失败: ${error.message}`);
      },
    }
  );

  const handleBulkDelete = () => bulkDeleteMutation.mutate(selectedIds);
  const handleBulkUpdateStatus = () => {
    if (!bulkActionData.status) {
      alert('请选择新状态');
      return;
    }
    bulkUpdateStatusMutation.mutate(selectedIds);
  };

  // 处理批量导出
  const handleBulkExport = () => {
    const exportData = series.filter((s) => selectedIdsSet.has(s.id));
    const csv = [
      ['ID', '标题', '类型', '状态', '评分', '描述'].join(','),
      ...exportData.map((s) =>
        [
          s.id,
          `"${s.title}"`,
          s.type === 'comic' ? '漫画' : '小说',
          s.status,
          Number(s.rating || 0).toFixed(1),
          `"${s.description || ''}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `series-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  // 渲染列表视图
  const renderListView = () => (
    <div className="rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-700 bg-neutral-900">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.length === series.length && series.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAll(series);
                    } else {
                      clearSelection();
                    }
                  }}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-neutral-400 cursor-pointer hover:text-neutral-300">
                标题
              </th>
              <th className="px-4 py-3 text-left text-neutral-400">类型</th>
              <th className="px-4 py-3 text-left text-neutral-400">状态</th>
              <th className="px-4 py-3 text-left text-neutral-400">评分</th>
              <th className="px-4 py-3 text-left text-neutral-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {series.map((item) => (
              <tr key={item.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIdsSet.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-3 text-neutral-300 font-medium">{item.title}</td>
                <td className="px-4 py-3 text-neutral-400">
                  <span className="px-2 py-1 rounded text-xs bg-neutral-700">
                    {item.type === 'comic' ? '漫画' : '小说'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      item.status === 'Ongoing'
                        ? 'bg-green-900/30 text-green-400'
                        : item.status === 'Completed'
                        ? 'bg-blue-900/30 text-blue-400'
                        : 'bg-yellow-900/30 text-yellow-400'
                    }`}
                  >
                    {item.status === 'Ongoing' ? '连载中' : item.status === 'Completed' ? '已完结' : '暂停'}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-300">{Number(item.rating || 0).toFixed(1)}</td>
                <td className="px-4 py-3">
                  <a
                    href={`/admin/series/${item.id}`}
                    className="text-blue-400 hover:text-blue-300 text-sm mr-3"
                  >
                    编辑
                  </a>
                  <a
                    href={`/admin/series/${item.id}/episodes`}
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    剧集
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // 渲染网格视图
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {series.map((item) => (
        <div
          key={item.id}
          className="rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden hover:border-neutral-600 transition-colors"
        >
          <div className="aspect-video bg-neutral-900 flex items-center justify-center overflow-hidden">
            {item.coverUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
              </>
            ) : (
              <div className="text-neutral-500">无封面</div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-neutral-100 flex-1 line-clamp-2">{item.title}</h3>
              <input
                type="checkbox"
                checked={selectedIdsSet.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="rounded ml-2"
              />
            </div>
            <div className="flex gap-2 mb-3">
              <span className="px-2 py-1 rounded text-xs bg-neutral-700 text-neutral-300">
                {item.type === 'comic' ? '漫画' : '小说'}
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  item.status === 'Ongoing'
                    ? 'bg-green-900/30 text-green-400'
                    : item.status === 'Completed'
                    ? 'bg-blue-900/30 text-blue-400'
                    : 'bg-yellow-900/30 text-yellow-400'
                }`}
              >
                {item.status === 'Ongoing' ? '连载中' : item.status === 'Completed' ? '已完结' : '暂停'}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-neutral-400">评分: {Number(item.rating || 0).toFixed(1)}</span>
              <span className="text-xs text-neutral-500">{item.ratingCount} 人评分</span>
            </div>
            <div className="flex gap-2">
              <a
                href={`/admin/series/${item.id}`}
                className="flex-1 px-3 py-2 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 text-center"
              >
                编辑
              </a>
              <a
                href={`/admin/series/${item.id}/episodes`}
                className="flex-1 px-3 py-2 rounded text-xs bg-purple-600 text-white hover:bg-purple-700 text-center"
              >
                剧集
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">作品管理</h1>
          <p className="text-neutral-400 mt-2">管理所有作品、剧集和内容</p>
        </div>

        {/* 工具栏 */}
        <div className="mb-6 flex gap-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="搜索作品..."
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

          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              列表
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              网格
            </button>
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-blue-900/20 border border-blue-700 flex items-center justify-between">
            <span className="text-blue-300">已选择 {selectedIds.length} 项</span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsBulkActionModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
              >
                更改状态
              </button>
              <button
                onClick={handleBulkExport}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm"
              >
                导出
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
              >
                删除
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 rounded-lg bg-neutral-700 text-neutral-300 hover:bg-neutral-600 text-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 内容区域 */}
        {isLoading ? (
          <LoadingState.Spinner size="md" />
        ) : series.length > 0 ? (
          viewMode === 'list' ? (
            renderListView()
          ) : (
            renderGridView()
          )
        ) : (
          <LoadingState.EmptyState message="暂无作品" />
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
            <label className="text-sm text-neutral-400">类型</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            >
              <option value="">全部</option>
              <option value="comic">漫画</option>
              <option value="novel">小说</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-neutral-400">状态</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            >
              <option value="">全部</option>
              <option value="Ongoing">连载中</option>
              <option value="Completed">已完结</option>
              <option value="Hiatus">暂停</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-neutral-400">排序</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            >
              <option value="createdAt">创建时间</option>
              <option value="rating">评分</option>
              <option value="title">标题</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="adult-filter"
              checked={filterAdult}
              onChange={(e) => setFilterAdult(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="adult-filter" className="text-sm text-neutral-400">
              仅显示成人内容
            </label>
          </div>

          <button
            onClick={() => {
              if (filterType) setFilter('type', filterType);
              if (filterStatus) setFilter('status', filterStatus);
              if (filterAdult) setFilter('adult', filterAdult);
              setIsFilterModalOpen(false);
            }}
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
        message={`确定要删除这 ${selectedIds.length} 部作品吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
