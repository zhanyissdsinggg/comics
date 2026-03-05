'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';

const STAT_CARD_STYLES = {
  blue: {
    container: 'bg-blue-900/20 border-blue-700',
    value: 'text-blue-400',
  },
  green: {
    container: 'bg-green-900/20 border-green-700',
    value: 'text-green-400',
  },
  purple: {
    container: 'bg-purple-900/20 border-purple-700',
    value: 'text-purple-400',
  },
  orange: {
    container: 'bg-orange-900/20 border-orange-700',
    value: 'text-orange-400',
  },
  emerald: {
    container: 'bg-emerald-900/20 border-emerald-700',
    value: 'text-emerald-400',
  },
};

export default function AdminMarketingPage() {
  const [viewMode, setViewMode] = useState('campaigns'); // campaigns, analytics, budget, segments
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [formData, setFormData] = useState({});
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // 获取营销活动列表
  const { data: campaignsData, isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery({
    queryKey: ['admin', 'marketing', 'campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/admin/marketing/campaigns', {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取营销统计数据
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'marketing', 'stats', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const response = await fetch(`/api/admin/marketing/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取按目标受众分组的统计
  const { data: segmentData, isLoading: segmentLoading } = useQuery({
    queryKey: ['admin', 'marketing', 'stats', 'by-segment', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const response = await fetch(`/api/admin/marketing/stats/by-segment?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取按活动类型分组的统计
  const { data: typeData, isLoading: typeLoading } = useQuery({
    queryKey: ['admin', 'marketing', 'stats', 'by-type', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const response = await fetch(`/api/admin/marketing/stats/by-type?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const campaigns = campaignsData?.campaigns || [];
  const stats = statsData?.stats;
  const segments = segmentData?.segments || [];
  const types = typeData?.types || [];
  const budgetUsagePct =
    stats && Number(stats.totalBudget) > 0
      ? Math.min(100, Math.max(0, (Number(stats.totalSpent) / Number(stats.totalBudget)) * 100))
      : 0;

  // 创建营销活动 mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/admin/marketing/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('创建营销活动失败');
      return response.json();
    },
    onSuccess: () => {
      setIsModalOpen(false);
      setFormData({});
      refetchCampaigns();
    },
  });

  // 删除营销活动 mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/admin/marketing/campaigns/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });
      if (!response.ok) throw new Error('删除营销活动失败');
      return response.json();
    },
    onSuccess: () => {
      setIsDeleteConfirmOpen(false);
      setSelectedCampaign(null);
      refetchCampaigns();
    },
  });

  const handleCreateCampaign = () => createCampaignMutation.mutate(formData);
  const handleDeleteCampaign = () => deleteCampaignMutation.mutate(selectedCampaign.id);

  // 渲染统计卡片
  const renderStatCard = (title, value, color = 'blue', unit = '') => {
    const style = STAT_CARD_STYLES[color] || STAT_CARD_STYLES.blue;

    return (
      <div className={`rounded-lg border p-4 ${style.container}`}>
        <p className="text-sm text-neutral-400">{title}</p>
        <p className={`mt-2 text-2xl font-bold ${style.value}`}>
          {typeof value === 'number' ? value.toFixed(2) : value}
          {unit && <span className="text-sm ml-1">{unit}</span>}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">营销活动管理</h1>
          <p className="text-neutral-400 mt-2">管理营销活动、效果分析、预算管理</p>
        </div>

        {/* 日期范围选择 */}
        <div className="mb-6 flex gap-4">
          <div>
            <label className="text-sm text-neutral-400">开始日期</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="mt-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>
          <div>
            <label className="text-sm text-neutral-400">结束日期</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="mt-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>
        </div>

        {/* 视图切换 */}
        <div className="flex gap-4 mb-6">
          {[
            { key: 'campaigns', label: '活动管理' },
            { key: 'analytics', label: '效果分析' },
            { key: 'budget', label: '预算管理' },
            { key: 'segments', label: '分群分析' },
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

        {/* 活动管理 */}
        {viewMode === 'campaigns' && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setFormData({});
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              + 创建活动
            </button>

            {campaignsLoading ? (
              <LoadingState.Spinner size="md" />
            ) : campaigns.length > 0 ? (
              <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700">
                        <th className="px-4 py-3 text-left text-neutral-400">活动名称</th>
                        <th className="px-4 py-3 text-left text-neutral-400">类型</th>
                        <th className="px-4 py-3 text-left text-neutral-400">目标受众</th>
                        <th className="px-4 py-3 text-left text-neutral-400">预算</th>
                        <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                        <th className="px-4 py-3 text-left text-neutral-400">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                          <td className="px-4 py-3 text-neutral-300">{campaign.name}</td>
                          <td className="px-4 py-3 text-neutral-300">{campaign.type}</td>
                          <td className="px-4 py-3 text-neutral-300">{campaign.targetSegment}</td>
                          <td className="px-4 py-3 text-emerald-400">${campaign.budget.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                campaign.status === 'active'
                                  ? 'bg-green-900/30 text-green-400'
                                  : campaign.status === 'draft'
                                  ? 'bg-yellow-900/30 text-yellow-400'
                                  : 'bg-gray-900/30 text-gray-400'
                              }`}
                            >
                              {campaign.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedCampaign(campaign);
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
              <LoadingState.EmptyState message="暂无营销活动" />
            )}
          </div>
        )}

        {/* 效果分析 */}
        {viewMode === 'analytics' && (
          <div className="space-y-6">
            {statsLoading ? (
              <LoadingState.Spinner size="md" />
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {renderStatCard('总活动数', stats.totalCampaigns, 'blue')}
                  {renderStatCard('活跃活动', stats.activeCampaigns, 'green')}
                  {renderStatCard('总预算', stats.totalBudget, 'purple', '$')}
                  {renderStatCard('已花费', stats.totalSpent, 'orange', '$')}
                  {renderStatCard('总收入', stats.totalRevenue, 'emerald', '$')}
                  {renderStatCard('平均ROI', stats.avgRoi, 'blue', '%')}
                </div>
              </>
            ) : (
              <LoadingState.EmptyState message="无数据" />
            )}
          </div>
        )}

        {/* 预算管理 */}
        {viewMode === 'budget' && (
          <div className="space-y-6">
            {statsLoading ? (
              <LoadingState.Spinner size="md" />
            ) : stats ? (
              <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-100 mb-4">预算概览</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">总预算</span>
                    <span className="text-emerald-400 font-semibold">${stats.totalBudget.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">已花费</span>
                    <span className="text-orange-400 font-semibold">${stats.totalSpent.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">剩余预算</span>
                    <span className="text-blue-400 font-semibold">${(stats.totalBudget - stats.totalSpent).toFixed(2)}</span>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${budgetUsagePct}%` }}
                      />
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">
                      预算使用率: {budgetUsagePct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <LoadingState.EmptyState message="无数据" />
            )}
          </div>
        )}

        {/* 分群分析 */}
        {viewMode === 'segments' && (
          <div className="space-y-6">
            {segmentLoading ? (
              <LoadingState.Spinner size="md" />
            ) : segments.length > 0 ? (
              <>
                <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                  <h3 className="text-lg font-semibold text-neutral-100 mb-4">按目标受众分组</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-700">
                          <th className="px-4 py-3 text-left text-neutral-400">目标受众</th>
                          <th className="px-4 py-3 text-left text-neutral-400">活动数</th>
                          <th className="px-4 py-3 text-left text-neutral-400">总预算</th>
                          <th className="px-4 py-3 text-left text-neutral-400">已花费</th>
                          <th className="px-4 py-3 text-left text-neutral-400">收入</th>
                          <th className="px-4 py-3 text-left text-neutral-400">转化数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {segments.map((segment) => (
                          <tr key={segment.segment} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                            <td className="px-4 py-3 text-neutral-300">{segment.segment}</td>
                            <td className="px-4 py-3 text-neutral-300">{segment.count}</td>
                            <td className="px-4 py-3 text-emerald-400">${segment.budget.toFixed(2)}</td>
                            <td className="px-4 py-3 text-orange-400">${segment.spent.toFixed(2)}</td>
                            <td className="px-4 py-3 text-blue-400">${segment.revenue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-neutral-300">{segment.converted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {typeLoading ? (
                  <LoadingState.Spinner size="md" />
                ) : types.length > 0 ? (
                  <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                    <h3 className="text-lg font-semibold text-neutral-100 mb-4">按活动类型分组</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-neutral-700">
                            <th className="px-4 py-3 text-left text-neutral-400">活动类型</th>
                            <th className="px-4 py-3 text-left text-neutral-400">活动数</th>
                            <th className="px-4 py-3 text-left text-neutral-400">总预算</th>
                            <th className="px-4 py-3 text-left text-neutral-400">已花费</th>
                            <th className="px-4 py-3 text-left text-neutral-400">收入</th>
                            <th className="px-4 py-3 text-left text-neutral-400">转化数</th>
                          </tr>
                        </thead>
                        <tbody>
                          {types.map((type) => (
                            <tr key={type.type} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                              <td className="px-4 py-3 text-neutral-300">{type.type}</td>
                              <td className="px-4 py-3 text-neutral-300">{type.count}</td>
                              <td className="px-4 py-3 text-emerald-400">${type.budget.toFixed(2)}</td>
                              <td className="px-4 py-3 text-orange-400">${type.spent.toFixed(2)}</td>
                              <td className="px-4 py-3 text-blue-400">${type.revenue.toFixed(2)}</td>
                              <td className="px-4 py-3 text-neutral-300">{type.converted}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <LoadingState.EmptyState message="无数据" />
            )}
          </div>
        )}
      </div>

      {/* 创建营销活动模态框 */}
      <Modal
        isOpen={isModalOpen}
        title="创建营销活动"
        onClose={() => setIsModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400">活动名称</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>
          <div>
            <label className="text-sm text-neutral-400">活动描述</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm text-neutral-400">活动类型</label>
            <select
              value={formData.type || ''}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            >
              <option value="">选择类型</option>
              <option value="email">邮件</option>
              <option value="push">推送</option>
              <option value="banner">横幅</option>
              <option value="discount">折扣</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-neutral-400">目标受众</label>
            <select
              value={formData.targetSegment || ''}
              onChange={(e) => setFormData({ ...formData, targetSegment: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            >
              <option value="">选择受众</option>
              <option value="all">全部用户</option>
              <option value="vip">VIP用户</option>
              <option value="new">新用户</option>
              <option value="at-risk">流失风险用户</option>
              <option value="high-value">高价值用户</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-neutral-400">预算</label>
            <input
              type="number"
              value={formData.budget || ''}
              onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
            />
          </div>
          <button
            onClick={handleCreateCampaign}
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
        message={`确定要删除 "${selectedCampaign?.name}" 吗？`}
        confirmText="删除"
        cancelText="取消"
        isDangerous={true}
        onConfirm={handleDeleteCampaign}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setSelectedCampaign(null);
        }}
      />
    </div>
  );
}
