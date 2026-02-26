'use client';
nexport const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingState } from '@/components/admin/common/LoadingState';

export default function AdminRevenuePageNew() {
  const [viewMode, setViewMode] = useState('overview'); // overview, trend, channels, promotions
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // 获取收入统计数据
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'stats', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const response = await fetch(`/api/admin/revenue/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取收入趋势数据
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'trend', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ ...dateRange, groupBy: 'day' });
      const response = await fetch(`/api/admin/revenue/trend?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取渠道分析数据
  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'channels', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const response = await fetch(`/api/admin/revenue/channels?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取促销效果分析
  const { data: promotionsData, isLoading: promotionsLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'promotions', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const response = await fetch(`/api/admin/revenue/promotions?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取用户价值分布
  const { data: userValueData, isLoading: userValueLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'user-value-distribution'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/revenue/user-value-distribution`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取订单状态分布
  const { data: orderStatusData, isLoading: orderStatusLoading } = useQuery({
    queryKey: ['admin', 'revenue', 'order-status-distribution', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const response = await fetch(`/api/admin/revenue/order-status-distribution?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = statsData?.stats;
  const trend = trendData?.trend;
  const channels = channelsData?.channels;
  const promotions = promotionsData?.promotions;
  const userValue = userValueData?.distribution;
  const orderStatus = orderStatusData?.distribution;

  // 渲染统计卡片
  const renderStatCard = (title, value, color = 'blue', unit = '') => (
    <div className={`rounded-lg bg-${color}-900/20 p-4 border border-${color}-700`}>
      <p className="text-sm text-neutral-400">{title}</p>
      <p className={`text-2xl font-bold text-${color}-400 mt-2`}>
        {typeof value === 'number' ? value.toFixed(2) : value}
        {unit && <span className="text-sm ml-1">{unit}</span>}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">收入管理</h1>
          <p className="text-neutral-400 mt-2">收入趋势、渠道分析、促销效果</p>
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
            { key: 'overview', label: '概览' },
            { key: 'trend', label: '趋势' },
            { key: 'channels', label: '渠道' },
            { key: 'promotions', label: '促销' },
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

        {/* 概览视图 */}
        {viewMode === 'overview' && (
          <div className="space-y-6">
            {statsLoading ? (
              <LoadingState.Spinner size="md" />
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {renderStatCard('总收入', stats.totalRevenue, 'emerald', '$')}
                  {renderStatCard('订单数', stats.totalOrders, 'blue')}
                  {renderStatCard('平均订单金额', stats.avgOrderValue, 'purple', '$')}
                  {renderStatCard('退款金额', stats.totalRefunded, 'red', '$')}
                  {renderStatCard('净收入', stats.netRevenue, 'green', '$')}
                </div>

                {/* 用户价值分布 */}
                {userValue && (
                  <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                    <h3 className="text-lg font-semibold text-neutral-100 mb-4">用户价值分布</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {renderStatCard('高价值用户', userValue.highValue, 'emerald')}
                      {renderStatCard('中价值用户', userValue.mediumValue, 'yellow')}
                      {renderStatCard('低价值用户', userValue.lowValue, 'orange')}
                      {renderStatCard('无消费用户', userValue.noValue, 'gray')}
                    </div>
                  </div>
                )}

                {/* 订单状态分布 */}
                {orderStatus && (
                  <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                    <h3 className="text-lg font-semibold text-neutral-100 mb-4">订单状态分布</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {renderStatCard('待支付', orderStatus.pending, 'yellow')}
                      {renderStatCard('已支付', orderStatus.paid, 'green')}
                      {renderStatCard('失败', orderStatus.failed, 'red')}
                      {renderStatCard('已退款', orderStatus.refunded, 'gray')}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <LoadingState.EmptyState message="无数据" />
            )}
          </div>
        )}

        {/* 趋势视图 */}
        {viewMode === 'trend' && (
          <div className="space-y-6">
            {trendLoading ? (
              <LoadingState.Spinner size="md" />
            ) : trend && trend.length > 0 ? (
              <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-100 mb-4">收入趋势</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700">
                        <th className="px-4 py-3 text-left text-neutral-400">日期</th>
                        <th className="px-4 py-3 text-left text-neutral-400">收入</th>
                        <th className="px-4 py-3 text-left text-neutral-400">订单数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trend.map((item) => (
                        <tr key={item.date} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                          <td className="px-4 py-3 text-neutral-300">{item.date}</td>
                          <td className="px-4 py-3 text-emerald-400">${item.revenue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-neutral-300">{item.orders}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <LoadingState.EmptyState message="无数据" />
            )}
          </div>
        )}

        {/* 渠道视图 */}
        {viewMode === 'channels' && (
          <div className="space-y-6">
            {channelsLoading ? (
              <LoadingState.Spinner size="md" />
            ) : channels && channels.length > 0 ? (
              <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-100 mb-4">渠道分析</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700">
                        <th className="px-4 py-3 text-left text-neutral-400">渠道</th>
                        <th className="px-4 py-3 text-left text-neutral-400">订单数</th>
                        <th className="px-4 py-3 text-left text-neutral-400">收入</th>
                        <th className="px-4 py-3 text-left text-neutral-400">平均订单金额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {channels.map((item) => (
                        <tr key={item.channel} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                          <td className="px-4 py-3 text-neutral-300">{item.channel}</td>
                          <td className="px-4 py-3 text-neutral-300">{item.orders}</td>
                          <td className="px-4 py-3 text-emerald-400">${item.revenue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-neutral-300">${item.avgOrderValue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <LoadingState.EmptyState message="无数据" />
            )}
          </div>
        )}

        {/* 促销视图 */}
        {viewMode === 'promotions' && (
          <div className="space-y-6">
            {promotionsLoading ? (
              <LoadingState.Spinner size="md" />
            ) : promotions && promotions.length > 0 ? (
              <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-100 mb-4">促销效果分析</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700">
                        <th className="px-4 py-3 text-left text-neutral-400">促销活动</th>
                        <th className="px-4 py-3 text-left text-neutral-400">订单数</th>
                        <th className="px-4 py-3 text-left text-neutral-400">收入</th>
                        <th className="px-4 py-3 text-left text-neutral-400">ROI</th>
                        <th className="px-4 py-3 text-left text-neutral-400">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promotions.map((item) => (
                        <tr key={item.promotionId} className="border-b border-neutral-700 hover:bg-neutral-700/50">
                          <td className="px-4 py-3 text-neutral-300">{item.title}</td>
                          <td className="px-4 py-3 text-neutral-300">{item.orders}</td>
                          <td className="px-4 py-3 text-emerald-400">${item.revenue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-blue-400">{item.roi}%</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                item.active
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'bg-gray-900/30 text-gray-400'
                              }`}
                            >
                              {item.active ? '活跃' : '已关闭'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <LoadingState.EmptyState message="无数据" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
