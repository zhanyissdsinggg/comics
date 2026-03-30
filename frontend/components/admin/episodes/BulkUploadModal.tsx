import React, { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import {
  AdminBadge,
  AdminFormField,
  adminInputClassName,
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Modal } from '@/components/admin/common/Modal';
import { adminFetch, readAdminResponseMessage } from '@/lib/adminApiClient';

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

  const handleClose = useCallback(() => {
    setFiles([]);
    setUploadProgress([]);
    setStartNumber('');
    setFeedback({ type: '', message: '' });
    onClose();
  }, [onClose]);

  const uploadMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append('files', file);
      });

      if (startNumber) {
        formData.append('startNumber', startNumber);
      }

      const response = await adminFetch(`/api/admin/series/${seriesId}/episodes/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '批量上传失败。'));
      }

      return response.json();
    },
    onSuccess: () => {
      setUploadProgress((current) => current.map((item) => ({ ...item, status: 'success', progress: 100 })));
      setFeedback({ type: 'success', message: '批量上传完成，正在刷新章节列表。' });

      window.setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1200);
    },
    onError: (error: Error) => {
      setUploadProgress((current) =>
        current.map((item) => ({
          ...item,
          status: 'error',
          error: error.message,
        })),
      );
      setFeedback({ type: 'error', message: error.message || '批量上传失败。' });
    },
  });

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) {
      return;
    }

    const zipFiles = Array.from(selectedFiles).filter((file) => file.name.toLowerCase().endsWith('.zip'));

    if (zipFiles.length === 0) {
      setFeedback({ type: 'error', message: '请至少选择一个 ZIP 文件。' });
      return;
    }

    if (zipFiles.length > 50) {
      setFeedback({ type: 'error', message: '单次最多上传 50 个 ZIP 文件。' });
      return;
    }

    setFeedback({ type: '', message: '' });
    setFiles(zipFiles);
    setUploadProgress(
      zipFiles.map((file) => ({
        fileName: file.name,
        status: 'pending',
        progress: 0,
      })),
    );
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      handleFileSelect(event.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleUpload = () => {
    if (files.length === 0) {
      setFeedback({ type: 'error', message: '请先选择要上传的 ZIP 文件。' });
      return;
    }

    setFeedback({ type: '', message: '' });
    setUploadProgress((current) => current.map((item) => ({ ...item, status: 'uploading', progress: 0 })));

    const progressTimer = window.setInterval(() => {
      setUploadProgress((current) =>
        current.map((item) => ({
          ...item,
          progress: item.status === 'uploading' ? Math.min(item.progress + 20, 90) : item.progress,
        })),
      );
    }, 250);

    uploadMutation.mutate(files, {
      onSettled: () => {
        window.clearInterval(progressTimer);
      },
    });
  };
  const canClose = !uploadMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      title="批量上传章节"
      subtitle="一次提交多个 ZIP 文件，系统会按顺序创建章节，让批量录入保持直接、安静、可控。"
      onClose={canClose ? handleClose : () => {}}
      size="2xl"
      closeButton={canClose}
    >
      <div className="space-y-5">
        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
          <div className="space-y-4">
            <AdminFormField
              label="起始章节号"
              helperText="可选。不填时系统会默认从当前最新章节后继续编号。"
            >
              <input
                type="number"
                min="1"
                value={startNumber}
                onChange={(event) => setStartNumber(event.target.value)}
                disabled={uploadMutation.isPending}
                className={adminInputClassName}
                placeholder="例如：101"
              />
            </AdminFormField>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-[28px] border-2 border-dashed p-8 text-center transition ${
                isDragging
                  ? 'border-[var(--gush-accent,#2f58c6)] bg-[rgba(47,88,198,0.08)]'
                  : 'border-black/10 bg-[rgba(250,247,241,0.76)]'
              }`}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-black/8 bg-white text-[var(--gush-accent,#2f58c6)]">
                <UploadCloud className="h-7 w-7" />
              </div>
              <p className="mt-5 text-sm font-semibold text-slate-950">
                把 ZIP 文件拖到这里，或从本地选择文件。
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                单次最多上传 50 个 ZIP 文件，建议单个压缩包控制在 50MB 以内。
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <AdminBadge tone={files.length > 0 ? 'accent' : 'default'}>
                  {files.length > 0 ? `已选 ${files.length} 个文件` : '等待选择文件'}
                </AdminBadge>
                <AdminBadge tone="default">支持 .zip</AdminBadge>
              </div>
              <input
                id="episode-bulk-upload"
                type="file"
                multiple
                accept=".zip"
                onChange={(event) => handleFileSelect(event.target.files)}
                disabled={uploadMutation.isPending}
                className="hidden"
              />
              <label
                htmlFor="episode-bulk-upload"
                className={`mt-5 inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 ${
                  uploadMutation.isPending ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                选择 ZIP 文件
              </label>
            </div>
          </div>

          <div className="rounded-[28px] border border-black/8 bg-white/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
            <p className="text-sm font-semibold text-slate-950">上传前确认</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>每个 ZIP 文件会对应创建一话章节。</li>
              <li>系统会按文件顺序依次入队和创建章节。</li>
              <li>上传完成后，当前章节列表会自动刷新。</li>
            </ul>

            <div className="mt-5 rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.82)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                当前队列
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-950">
                {uploadProgress.length > 0 ? `${uploadProgress.length} 个待处理文件` : '还没有文件进入队列'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {startNumber
                  ? `创建会从章节号 ${startNumber} 开始。`
                  : '未指定起始章节号时，系统会从当前最新章节后继续。'}
              </p>
            </div>
          </div>
        </div>

        {uploadProgress.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">
                上传队列（{uploadProgress.length}）
              </h3>
              <p className="text-xs text-slate-500">状态会在当前窗口内持续刷新。</p>
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {uploadProgress.map((item, index) => (
                <div
                  key={`${item.fileName}-${index}`}
                  className="rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.78)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950">{item.fileName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.status === 'success'
                          ? '文件已处理完成。'
                          : item.status === 'error'
                            ? '处理失败，请检查提示后重试。'
                            : item.status === 'uploading'
                              ? '文件正在上传与创建章节。'
                              : '等待开始上传。'}
                      </p>
                    </div>
                    <AdminBadge
                      tone={
                        item.status === 'success'
                          ? 'success'
                          : item.status === 'error'
                            ? 'danger'
                            : item.status === 'uploading'
                              ? 'accent'
                              : 'default'
                      }
                    >
                      {item.status === 'success'
                        ? '完成'
                        : item.status === 'error'
                          ? '失败'
                          : item.status === 'uploading'
                            ? '上传中'
                            : '等待中'}
                    </AdminBadge>
                  </div>

                  {item.status === 'uploading' ? (
                    <div className="mt-3 h-1.5 w-full rounded-full bg-white">
                      <div
                        className="h-1.5 rounded-full bg-[var(--gush-accent,#2f58c6)] transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  ) : null}

                  {item.error ? <p className="mt-3 text-xs leading-5 text-red-700">{item.error}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={files.length === 0 || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? '上传中...' : `开始上传（${files.length}）`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
