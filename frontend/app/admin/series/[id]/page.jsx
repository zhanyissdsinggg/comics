'use client';
nexport const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LoadingState } from '@/components/admin/common/LoadingState';
import { Modal } from '@/components/admin/common/Modal';

export default function AdminSeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seriesId = params.id;

  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 获取作品详情
  const { data: seriesData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'series', seriesId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/series/${seriesId}`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const series = seriesData?.series;

  // 保存作品信息 mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`/api/admin/series/${seriesId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          type: data.type,
          status: data.status,
          adult: data.adult,
          description: data.description,
          genres: data.genres.split(',').map((g) => g.trim()).filter(Boolean),
          coverUrl: data.coverUrl,
          coverTone: data.coverTone,
          badge: data.badge,
          episodePrice: parseInt(data.episodePrice) || 0,
          ttfEnabled: data.ttfEnabled,
          ttfIntervalHours: parseInt(data.ttfIntervalHours) || 24,
        }),
      });
      if (!response.ok) throw new Error('保存失败');
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage('保存成功！');
      setIsEditing(false);
      refetch();
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: () => {
      setErrorMessage('保存失败，请重试');
    },
  });

  // 上传封面 mutation
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/admin/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: formDataUpload,
      });
      if (!response.ok) throw new Error('上传失败');
      return response.json();
    },
    onSuccess: (data) => {
      setFormData({ ...formData, coverUrl: data.url });
      setSuccessMessage('封面上传成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: () => {
      setErrorMessage('上传失败，请重试');
    },
  });

  // 初始化表单数据
  React.useEffect(() => {
    if (series && !isEditing) {
      setFormData({
        title: series.title || '',
        type: series.type || 'comic',
        status: series.status || 'Ongoing',
        adult: series.adult || false,
        description: series.description || '',
        genres: (series.genres || []).join(', '),
        coverUrl: series.coverUrl || '',
        coverTone: series.coverTone || '',
        badge: series.badge || '',
        episodePrice: series.episodePrice || 0,
        ttfEnabled: series.ttfEnabled || false,
        ttfIntervalHours: series.ttfIntervalHours || 24,
      });
    }
  }, [series, isEditing]);

  const handleSave = () => {
    if (!formData.title?.trim()) {
      setErrorMessage('请输入作品标题');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('请选择图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('图片文件不能超过10MB');
      return;
    }

    uploadMutation.mutate(file);
  };

  if (isLoading) {
    return <LoadingState.Spinner size="md" />;
  }

  if (!series) {
    return <LoadingState.EmptyState message="作品不存在" />;
  }

  return (
    <div className="min-h-screen bg-neutral-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-100">作品详情</h1>
            <p className="text-neutral-400 mt-2">{series.title}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          >
            返回
          </button>
        </div>

        {/* 消息提示 */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-lg bg-green-900/20 border border-green-700 text-green-400">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-700 text-red-400">
            {errorMessage}
          </div>
        )}

        {/* 编辑按钮 */}
        <div className="mb-6 flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                编辑
              </button>
              <a
                href={`/admin/series/${seriesId}/episodes`}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 text-center"
              >
                管理剧集
              </a>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-lg bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
              >
                取消
              </button>
            </>
          )}
        </div>

        {/* 内容区域 */}
        <div className="rounded-lg bg-neutral-800 border border-neutral-700 p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-neutral-400">标题</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={!isEditing}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm text-neutral-400">类型</label>
              <select
                value={formData.type || ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={!isEditing}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 disabled:opacity-50"
              >
                <option value="comic">漫画</option>
                <option value="novel">小说</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-neutral-400">状态</label>
              <select
                value={formData.status || ''}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={!isEditing}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 disabled:opacity-50"
              >
                <option value="Ongoing">连载中</option>
                <option value="Completed">已完结</option>
                <option value="Hiatus">暂停</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-neutral-400">单集价格</label>
              <input
                type="number"
                value={formData.episodePrice || 0}
                onChange={(e) => setFormData({ ...formData, episodePrice: e.target.value })}
                disabled={!isEditing}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 disabled:opacity-50"
              />
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="text-sm text-neutral-400">描述</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!isEditing}
              rows={4}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 disabled:opacity-50"
            />
          </div>

          {/* 分类 */}
          <div>
            <label className="text-sm text-neutral-400">分类（逗号分隔）</label>
            <input
              type="text"
              value={formData.genres || ''}
              onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
              disabled={!isEditing}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 disabled:opacity-50"
            />
          </div>

          {/* 封面 */}
          <div>
            <label className="text-sm text-neutral-400">封面</label>
            <div className="mt-2 flex gap-4">
              {formData.coverUrl && (
                <div className="w-32 h-48 rounded-lg overflow-hidden bg-neutral-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.coverUrl}
                    alt="封面"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {isEditing && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="flex-1"
                />
              )}
            </div>
          </div>

          {/* TTF设置 */}
          <div className="border-t border-neutral-700 pt-6">
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">TTF设置</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ttf-enabled"
                  checked={formData.ttfEnabled || false}
                  onChange={(e) => setFormData({ ...formData, ttfEnabled: e.target.checked })}
                  disabled={!isEditing}
                  className="rounded"
                />
                <label htmlFor="ttf-enabled" className="text-sm text-neutral-400">
                  启用TTF（限时免费）
                </label>
              </div>

              {formData.ttfEnabled && (
                <div>
                  <label className="text-sm text-neutral-400">刷新间隔（小时）</label>
                  <input
                    type="number"
                    value={formData.ttfIntervalHours || 24}
                    onChange={(e) => setFormData({ ...formData, ttfIntervalHours: e.target.value })}
                    disabled={!isEditing}
                    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 disabled:opacity-50"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 其他设置 */}
          <div className="border-t border-neutral-700 pt-6">
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">其他设置</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="adult"
                  checked={formData.adult || false}
                  onChange={(e) => setFormData({ ...formData, adult: e.target.checked })}
                  disabled={!isEditing}
                  className="rounded"
                />
                <label htmlFor="adult" className="text-sm text-neutral-400">
                  成人内容
                </label>
              </div>

              <div>
                <label className="text-sm text-neutral-400">徽章</label>
                <input
                  type="text"
                  value={formData.badge || ''}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-sm text-neutral-400">封面色调</label>
                <input
                  type="text"
                  value={formData.coverTone || ''}
                  onChange={(e) => setFormData({ ...formData, coverTone: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
