/**
 * 老王说：批量上传剧集组件
 * 支持拖拽上传、进度显示、错误处理
 */

import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';

interface UploadProgress {
  fileName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface BulkUploadModalProps {
  isOpen: boolean;
  seriesId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkUploadModal({ isOpen, seriesId, onClose, onSuccess }: BulkUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startNumber, setStartNumber] = useState('');
  const [feedback, setFeedback] = useState<{ type: '' | 'error' | 'success'; message: string }>({
    type: '',
    message: '',
  });

  const uploadMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append('files', file);
      });
      if (startNumber) {
        formData.append('startNumber', startNumber);
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
      const response = await fetch(`/api/admin/series/${seriesId}/episodes/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '上传失败');
      }

      return response.json();
    },
    onSuccess: () => {
      setUploadProgress((prev) =>
        prev.map((p) => ({ ...p, status: 'success', progress: 100 }))
      );
      setFeedback({ type: 'success', message: '批量上传成功。' });
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    },
    onError: (error: Error) => {
      setUploadProgress((prev) =>
        prev.map((p) => ({
          ...p,
          status: 'error',
          error: error.message,
        }))
      );
    },
  });

  const handleClose = () => {
    setFiles([]);
    setUploadProgress([]);
    setStartNumber('');
    setFeedback({ type: '', message: '' });
    onClose();
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const zipFiles = Array.from(selectedFiles).filter((file) =>
      file.name.toLowerCase().endsWith('.zip')
    );

    if (zipFiles.length === 0) {
      setFeedback({ type: 'error', message: '请选择 ZIP 格式文件。' });
      return;
    }

    if (zipFiles.length > 50) {
      setFeedback({ type: 'error', message: '单次最多上传 50 个文件。' });
      return;
    }

    setFeedback({ type: '', message: '' });
    setFiles(zipFiles);
    setUploadProgress(
      zipFiles.map((file) => ({
        fileName: file.name,
        status: 'pending',
        progress: 0,
      }))
    );
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleUpload = () => {
    if (files.length === 0) {
      setFeedback({ type: 'error', message: '请先选择文件。' });
      return;
    }

    setFeedback({ type: '', message: '' });
    setUploadProgress((prev) =>
      prev.map((p) => ({ ...p, status: 'uploading', progress: 50 }))
    );

    uploadMutation.mutate(files);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-neutral-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-100">批量上传剧集</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-300"
            disabled={uploadMutation.isPending}
          >
            ✕
          </button>
        </div>

        {feedback.message ? (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        {/* 起始剧集号 */}
        <div className="mb-4">
          <label className="text-sm text-neutral-400">
            起始剧集号（可选，留空则自动续接）
          </label>
          <input
            type="number"
            value={startNumber}
            onChange={(e) => setStartNumber(e.target.value)}
            placeholder="例如: 1"
            disabled={uploadMutation.isPending}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-500"
          />
        </div>

        {/* 拖拽上传区域 */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-900/20'
              : 'border-neutral-600 bg-neutral-900'
          }`}
        >
          <div className="text-neutral-400 mb-4">
            <svg
              className="mx-auto h-12 w-12 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm">拖拽ZIP文件到这里，或点击选择文件</p>
            <p className="text-xs text-neutral-500 mt-2">
              支持批量上传，最多50个文件，每个文件最大50MB
            </p>
          </div>
          <input
            type="file"
            multiple
            accept=".zip"
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={uploadMutation.isPending}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
          >
            选择文件
          </label>
        </div>

        {/* 文件列表和进度 */}
        {uploadProgress.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-medium text-neutral-300 mb-3">
              文件列表 ({uploadProgress.length})
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {uploadProgress.map((item, index) => (
                <div
                  key={index}
                  className="bg-neutral-900 rounded-lg p-3 border border-neutral-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-300 truncate flex-1">
                      {item.fileName}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        item.status === 'success'
                          ? 'bg-green-900/30 text-green-400'
                          : item.status === 'error'
                          ? 'bg-red-900/30 text-red-400'
                          : item.status === 'uploading'
                          ? 'bg-blue-900/30 text-blue-400'
                          : 'bg-neutral-700 text-neutral-400'
                      }`}
                    >
                      {item.status === 'success'
                        ? '✓ 成功'
                        : item.status === 'error'
                        ? '✗ 失败'
                        : item.status === 'uploading'
                        ? '上传中...'
                        : '等待'}
                    </span>
                  </div>
                  {item.status === 'uploading' && (
                    <div className="w-full bg-neutral-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.error && (
                    <p className="text-xs text-red-400 mt-1">{item.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={files.length === 0 || uploadMutation.isPending}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? '上传中...' : `开始上传 (${files.length})`}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="px-4 py-2 rounded-lg bg-neutral-700 text-neutral-300 hover:bg-neutral-600 disabled:opacity-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
