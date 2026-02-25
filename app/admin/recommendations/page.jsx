'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';

export default function AdminRecommendationsPage() {
  const [viewMode, setViewMode] = useState('slots'); // slots, rankings, analytics
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});

  // 获取推荐位列表
  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ['admin', 'recommendations', 'slots'],
    queryFn: async () => {
      const response = await fetch('/api/admin/recommendations/slots', {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取排行榜配置列表
  const { data: rankingsData, isLoading: rankingsLoading, refetch: refetchRankings } = useQuery({
    queryKey: ['admin', 'recommendations', 'rankings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/recommendations/rankings', {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取推荐效果分析
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin', 'recommendations', 'analytics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/recommendations/analytics', {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const slots = slotsData?.slots || [];
  const rankings = rankingsData?.configs || [];
  const analytics = analyticsData?.analytics || [];

  // 创建推荐位
  const handleCreateSlot = async () => {
    try {
      const response = await fetch('/api/admin/recommendations/slots', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setIsModalOpen(false);
        setFormData({});
        refetchSlots();
      }
    } catch (error) {
      console.error('创建推荐位失败:', error);
    }
  };

  // 删除推荐位
  const handleDeleteSlot = async () => {
    try {
      const response = await fetch(`/api/admin/recommendations/slots/${selectedItem.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });
      if (response.ok) {
        setIsDeleteConfirmOpen(false);
        setSelectedItem(null);
        refetchSlots();
      }
    } catch (error) {
      console.error('删除推荐位失败:', error);
    }
  };

  // 创建排行榜配置
  const handleCreateRanking = async () => {
    try {
      const response = await fetch('/api/admin/recommendations/rankings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setIsModalOpen(false);
        setFormData({});
        refetchRankings();
      }
    } catch (error) {
      console.error('创建排行榜配置失败:', error);
    }
  };

  // 删除排行榜配置
  const handleDeleteRanking = async () => {
    try {
      const response = await fetch(`/api/admin/recommendations/rankings/${selectedItem.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });
      if (response.ok) {
        setIsDeleteConfirmOpen(false);
        setSelectedItem(null);
        refetchRankings();
      }
    } catch (error) {
      console.error('删除排行榜配置失败:', error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">推荐和排行榜管理</h1>
          <p className="text-neutral-400 mt-2">管理推荐位、排行榜配置、效果分析</p>
        </div>

        {/* 视图切换 */}
        <div className="flex gap-4 mb-6">
          {[
            { key: 'slots', label: '推荐位管理' },
            { key: 'rankings', label: '排行榜配置' },
            { key: 'analytics', label: '效果分析' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setViewMode(item.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === item.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 推荐位管理 */}
        {viewMode === 'slots' && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setFormData({});
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              + 创建推荐位
            </button>

            {slotsLoading ? (
              <LoadingState.Spinner size="md" />
            ) : slots.length > 0 ? (
              <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700">
                        <th className="px-4 py-3 text-left text-neutral-400">推荐位名称</th>
                        <th className="px-4 py-3 text-left text-neutral-400">类型</th>
                        <th className="px-4 py-3 text-left text-neutral-400">算法</th>
                        <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                        <th className="px-4 py-3 text-left text-neutral-400">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot: any) => (
                        <tr key={slot.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                          <td className="px-4 py-3 text-neutral-300">{slot.name}</td>
                          <td className="px-4 py-3 text-neutral-300">{slot.slotType}</td>
                          <td className="px-4 py-3 text-neutral-300">{slot.algorithm}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                slot.active
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'bg-gray-900/30 text-gray-400'
                              }`}
                            >
                              {slot.active ? '活跃' : '已禁用'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedItem(slot);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <LoadingState.EmptyState message="暂无推荐位" />
            )}
          </div>
        )}

        {/* 排行榜配置 */}
        {viewMode === 'rankings' && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setFormData({});
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              + 创建排行榜
            </button>

            {rankingsLoading ? (
              <LoadingState.Spinner size="md" />
            ) : rankings.length > 0 ? (
              <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700">
                        <th className="px-4 py-3 text-left text-neutral-400">排行榜名称</th>
                        <th className="px-4 py-3 text-left text-neutral-400">类型</th>
                        <th className="px-4 py-3 text-left text-neutral-400">时间范围</th>
                        <th className="px-4 py-3 text-left text-neutral-400">作品类型</th>
                        <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                        <th className="px-4 py-3 text-left text-neutral-400">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((ranking: any) => (
                        <tr key={ranking.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                          <td className="px-4 py-3 text-neutral-300">{ranking.name}</td>
                          <td className="px-4 py-3 text-neutral-300">{ranking.rankingType}</td>
                          <td className="px-4 py-3 text-neutral-300">{ranking.timeRange}</td>
                          <td className="px-4 py-3 text-neutral-300">{ranking.seriesType}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                ranking.active
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'bg-gray-900/30 text-gray-400'
                              }`}
                            >
                              {ranking.active ? '活跃' : '已禁用'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedItem(ranking);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <LoadingState.EmptyState message="暂无排行榜配置" />
            )}
          </div>
        )}

        {/* 效果分析 */}
        {viewMode === 'analytics' && (
          <div className="space-y-6">
            {analyticsLoading ? (
              <LoadingState.Spinner size="md" />
            ) : analytics.length > 0 ? (
              <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700">
                        <th className="px-4 py-3 text-left text-neutral-400">推荐位ID</th>
                        <th className="px-4 py-3 text-left text-neutral-400">作品ID</th>
                        <th className="px-4 py-3 text-left text-neutral-400">展示次数</th>
                        <th className="px-4 py-3 text-left text-neutral-400">点击次数</th>
                        <th className="px-4 py-3 text-left text-neutral-400">点击率</th>
                        <th className="px-4 py-3 text-left text-neutral-400">转化次数</th>
                        <th className="px-4 py-3 text-left text-neutral-400">转化率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((item: any) => (
                        <tr key={`${item.slotId}-${item.seriesId}`} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                          <td className="px-4 py-3 text-neutral-300">{item.slotId.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-neutral-300">{item.seriesId.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-neutral-300">{item.impressions}</td>
                          <td className="px-4 py-3 text-neutral-300">{item.clicks}</td>
                          <td className="px-4 py-3 text-blue-400">{item.ctr.toFixed(2)}%</td>
                          <td className="px-4 py-3 text-neutral-300">{item.conversions}</td>
                          <td className="px-4 py-3 text-emerald-400">{item.conversionRate.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <LoadingState.EmptyState message="暂无分析数据" />
            )}
          </div>
        )}
      </div>

      {/* 创建推荐位/排行榜模态框 */}
      <Modal
        isOpen={isModalOpen}
        title={viewMode === 'slots' ? '创建推荐位' : '创建排行榜'}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="space-y-4">
          {viewMode === 'slots' ? (
            <>
              <div>
                <label className="text-sm text-neutral-400">推荐位名称</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400">推荐位类型</label>
                <select
                  value={formData.slotType || ''}
                  onChange={(e) => setFormData({ ...formData, slotType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
                >
                  <option value="">选择类型</option>
                  <option value="banner">Banner</option>
                  <option value="carousel">轮播</option>
                  <option value="list">列表</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-400">推荐算法</label>
                <select
                  value={formData.algorithm || ''}
                  onChange={(e) => setFormData({ ...formData, algorithm: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
                >
                  <option value="">选择算法</option>
                  <option value="trending">热门</option>
                  <option value="personalized">个性化</option>
                  <option value="random">随机</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm text-neutral-400">排行榜名称</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400">排行榜类型</label>
                <select
                  value={formData.rankingType || ''}
                  onChange={(e) => setFormData({ ...formData, rankingType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
                >
                  <option value="">选择类型</option>
                  <option value="views">浏览量</option>
                  <option value="rating">评分</option>
                  <option value="follows">关注数</option>
                  <option value="trending">热门</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-400">时间范围</label>
                <select
                  value={formData.timeRange || ''}
                  onChange={(e) => setFormData({ ...formData, timeRange: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
                >
                  <option value="">选择范围</option>
                  <option value="day">日</option>
                  <option value="week">周</option>
                  <option value="month">月</option>
                  <option value="all">全部</option>
                </select>
              </div>
            </>
          )}
          <button
            onClick={viewMode === 'slots' ? handleCreateSlot : handleCreateRanking}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            创建
          </button>
        </div>
      </Modal>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="确认删除"
        message={`确定要删除 "${selectedItem?.name}" 吗？`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        onConfirm={viewMode === 'slots' ? handleDeleteSlot : handleDeleteRanking}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setSelectedItem(null);
        }}
      />
    </div>
  );
}
