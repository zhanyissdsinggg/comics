/**
 * 老王说：用户价值分析看板
 * 这个SB页面展示用户分层、LTV、流失风险等关键运营指标
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/adminApiClient';
import { Modal } from '@/components/admin/common/Modal';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { ConfirmDialog } from '@/components/admin/common/ConfirmDialog';

export default function AdminUserAnalyticsPage() {
  const [viewMode, setViewMode] = useState('stats'); // stats, segments, user-detail
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 获取分析统计数据
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics/stats', {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取用户分层数据
  const { data: segmentsData, isLoading: segmentsLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'segments', selectedSegment, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        segment: selectedSegment,
        limit: String(pageSize),
        offset: String((currentPage - 1) * pageSize),
      });
      const response = await fetch(`/api/admin/analytics/segments?${params}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // 获取用户详情
  const { data: userDetailData, isLoading: userDetailLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'user', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const response = await fetch(`/api/admin/analytics/users/${selectedUserId}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    enabled: !!selectedUserId,
    staleTime: 5 * 60 * 1000,
  });

  const stats = statsData?.stats;
  const segments = segmentsData?.segments;
  const userDetail = userDetailData?.analytics;

  // 渲染统计卡片
  const renderStatCard = (title, value, color = 'blue') => (
    <div className={`rounded-lg bg-${color}-900/20 p-4 border border-${color}-700`}>
      <p className="text-sm text-neutral-400">{title}</p>
      <p className={`text-2xl font-bold text-${color}-400 mt-2`}>{value}</p>
    </div>
  );

  // 渲染用户分层表格
  const renderSegmentsTable = () => {
    if (segmentsLoading) {
      return <LoadingState.Spinner size="md" />;
    }

    if (!segments || segments.users.length === 0) {
      return <LoadingState.EmptyState message="没有用户数据" />;
    }

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="px-4 py-3 text-left text-neutral-400">用户ID</th>
                <th className="px-4 py-3 text-left text-neutral-400">邮箱</th>
                <th className="px-4 py-3 text-left text-neutral-400">LTV</th>
                <th className="px-4 py-3 text-left text-neutral-400">总消费</th>
                <th className="px-4 py-3 text-left text-neutral-400">订单数</th>
                <th className="px-4 py-3 text-left text-neutral-400">流失风险</th>
                <th className="px-4 py-3 text-left text-neutral-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {segments.users.map((user) => (
                <tr key={user.id} className="border-b border-neutral-700 hover:bg-neutral-800/50">
                  <td className="px-4 py-3 text-neutral-300">{user.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-neutral-300">{user.email}</td>
                  <td className="px-4 py-3 text-emerald-400">
                    ${user.userMetrics?.ltv?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    ${user.userMetrics?.totalSpent?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {user.userMetrics?.totalOrders || 0}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.userMetrics?.churnRisk === 'high'
                          ? 'bg-red-900/30 text-red-400'
                          : user.userMetrics?.churnRisk === 'medium'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-green-900/30 text-green-400'
                      }`}
                    >
                      {user.userMetrics?.churnRisk || 'unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setViewMode('user-detail');
                      }}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-400">
            共 {segments.total} 条数据，第 {currentPage} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-neutral-700 text-neutral-300 disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() =>
                setCurrentPage(
                  Math.min(Math.ceil(segments.total / pageSize), currentPage + 1)
                )
              }
              disabled={currentPage >= Math.ceil(segments.total / pageSize)}
              className="px-3 py-1 rounded bg-neutral-700 text-neutral-300 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染用户详情
  const renderUserDetail = () => {
    if (userDetailLoading) {
      return <LoadingState.Spinner size="md" />;
    }

    if (!userDetail) {
      return <LoadingState.EmptyState message="用户不存在" />;
    }

    const { user, ltv, churnRisk } = userDetail;

    return (
      <div className="space-y-6">
        {/* 用户基本信息 */}
        <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-100 mb-4">基本信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-neutral-400">用户ID</p>
              <p className="text-neutral-200 font-mono">{user.id}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">邮箱</p>
              <p className="text-neutral-200">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">注册时间</p>
              <p className="text-neutral-200">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">账户状态</p>
              <p className={user.isBlocked ? 'text-red-400' : 'text-green-400'}>
                {user.isBlocked ? '已封禁' : '正常'}
              </p>
            </div>
          </div>
        </div>

        {/* LTV和流失风险 */}
        <div className="grid grid-cols-2 gap-4">
          {renderStatCard('生命周期价值 (LTV)', `$${ltv.ltv.toFixed(2)}`, 'emerald')}
          {renderStatCard(
            '流失风险',
            churnRisk.toUpperCase(),
            churnRisk === 'high' ? 'red' : churnRisk === 'medium' ? 'yellow' : 'green'
          )}
        </div>

        {/* 消费数据 */}
        <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-100 mb-4">消费数据</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-neutral-400">总消费</p>
              <p className="text-2xl font-bold text-emerald-400">${ltv.totalSpent.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">订单数</p>
              <p className="text-2xl font-bold text-blue-400">{ltv.totalOrders}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">平均订单金额</p>
              <p className="text-2xl font-bold text-purple-400">${ltv.avgOrderValue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">首次订单</p>
              <p className="text-neutral-200">
                {ltv.firstOrderDate ? new Date(ltv.firstOrderDate).toLocaleDateString() : '无'}
              </p>
            </div>
          </div>
        </div>

        {/* 行为数据 */}
        {user.userBehavior && (
          <div className="rounded-lg bg-neutral-800 p-4 border border-neutral-700">
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">行为数据</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-400">阅读时长</p>
                <p className="text-neutral-200">{user.userBehavior.readingTime} 分钟</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">浏览作品数</p>
                <p className="text-neutral-200">{user.userBehavior.seriesViewed}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">评论数</p>
                <p className="text-neutral-200">{user.userBehavior.commentsCount}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">评分数</p>
                <p className="text-neutral-200">{user.userBehavior.ratingsCount}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">收藏数</p>
                <p className="text-neutral-200">{user.userBehavior.bookmarksCount}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">最后活跃</p>
                <p className="text-neutral-200">
                  {user.userBehavior.lastActiveAt
                    ? new Date(user.userBehavior.lastActiveAt).toLocaleDateString()
                    : '无'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">用户价值分析</h1>
          <p className="text-neutral-400 mt-2">用户分层、LTV计算、流失预警</p>
        </div>

        {/* 视图切换 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setViewMode('stats')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            统计概览
          </button>
          <button
            onClick={() => setViewMode('segments')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'segments'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            用户分群
          </button>
        </div>

        {/* 统计概览 */}
        {viewMode === 'stats' && (
          <div className="space-y-6">
            {statsLoading ? (
              <LoadingState.Spinner size="md" />
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {renderStatCard('总用户数', stats.totalUsers, 'blue')}
                  {renderStatCard('活跃用户', stats.activeUsers, 'emerald')}
                  {renderStatCard('活跃率', stats.activeRate, 'purple')}
                  {renderStatCard('高价值用户', stats.highValueUsers, 'yellow')}
                  {renderStatCard('流失风险用户', stats.atRiskUsers, 'red')}
                  {renderStatCard('总收入', `$${stats.totalRevenue.toFixed(2)}`, 'green')}
                </div>
              </>
            ) : (
              <LoadingState.EmptyState message="无数据" />
            )}
          </div>
        )}

        {/* 用户分群 */}
        {viewMode === 'segments' && (
          <div className="space-y-6">
            {/* 分群筛选 */}
            <div className="flex gap-2">
              {['all', 'vip', 'high-value', 'at-risk'].map((segment) => (
                <button
                  key={segment}
                  onClick={() => {
                    setSelectedSegment(segment);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedSegment === segment
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {segment === 'all'
                    ? '全部用户'
                    : segment === 'vip'
                    ? 'VIP用户'
                    : segment === 'high-value'
                    ? '高价值用户'
                    : '流失风险用户'}
                </button>
              ))}
            </div>

            {/* 用户表格 */}
            {renderSegmentsTable()}
          </div>
        )}

        {/* 用户详情 */}
        {viewMode === 'user-detail' && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setViewMode('segments');
                setSelectedUserId(null);
              }}
              className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            >
              ← 返回列表
            </button>
            {renderUserDetail()}
          </div>
        )}
      </div>
    </div>
  );
}
