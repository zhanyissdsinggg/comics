import React, { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UploadCloud, X } from 'lucide-react';

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
        throw new Error(await readAdminResponseMessage(response, 'Bulk upload failed.'));
      }

      return response.json();
    },
    onSuccess: () => {
      setUploadProgress((current) => current.map((item) => ({ ...item, status: 'success', progress: 100 })));
      setFeedback({ type: 'success', message: 'Bulk upload finished. Refreshing the episode list now.' });

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
      setFeedback({ type: 'error', message: error.message || 'Bulk upload failed.' });
    },
  });

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) {
      return;
    }

    const zipFiles = Array.from(selectedFiles).filter((file) => file.name.toLowerCase().endsWith('.zip'));

    if (zipFiles.length === 0) {
      setFeedback({ type: 'error', message: 'Choose at least one ZIP file.' });
      return;
    }

    if (zipFiles.length > 50) {
      setFeedback({ type: 'error', message: 'Upload up to 50 ZIP files at a time.' });
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
      setFeedback({ type: 'error', message: 'Choose the ZIP files you want to upload first.' });
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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,27,36,0.28)] p-4 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-black/8 bg-white/96 p-6 shadow-[var(--gush-shadow-panel)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Bulk upload episodes</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Upload ZIP packages and let the workspace create episodes in file order.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="rounded-full border border-black/8 bg-white p-2 text-slate-500 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950 disabled:opacity-50"
            aria-label="Close bulk upload dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {feedback.message ? (
          <div
            className={`mb-4 rounded-[22px] border p-4 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
                : 'border-red-200 bg-red-50/90 text-red-700'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Starting episode number</label>
          <input
            type="number"
            min="1"
            value={startNumber}
            onChange={(event) => setStartNumber(event.target.value)}
            disabled={uploadMutation.isPending}
            className="h-11 w-full rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.88)] px-4 text-sm text-slate-950 outline-none transition focus:border-[var(--gush-accent,#2f58c6)]"
            placeholder="Optional. Leave blank to continue after the latest episode."
          />
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-[26px] border-2 border-dashed p-8 text-center transition ${
            isDragging
              ? 'border-[var(--gush-accent,#2f58c6)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]'
              : 'border-black/10 bg-[rgba(250,247,241,0.76)] text-slate-500'
          }`}
        >
          <div className="mb-4 flex justify-center">
            <UploadCloud className="h-12 w-12" />
          </div>
          <p className="text-sm font-medium text-slate-950">Drop ZIP files here, or choose them manually.</p>
          <p className="mt-2 text-xs text-slate-500">Upload up to 50 ZIP files per run. Keep each file under about 50MB when possible.</p>
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
            className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Choose ZIP files
          </label>
        </div>

        {uploadProgress.length > 0 ? (
          <div className="mt-6 space-y-2">
            <h3 className="mb-3 text-sm font-semibold text-slate-950">
              Upload queue ({uploadProgress.length})
            </h3>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {uploadProgress.map((item, index) => (
                <div key={`${item.fileName}-${index}`} className="rounded-[20px] border border-black/8 bg-[rgba(250,247,241,0.78)] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="flex-1 truncate text-sm text-slate-700">{item.fileName}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.status === 'success'
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : item.status === 'error'
                            ? 'border border-red-200 bg-red-50 text-red-700'
                            : item.status === 'uploading'
                              ? 'border border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]'
                              : 'border border-black/8 bg-white text-slate-600'
                      }`}
                    >
                      {item.status === 'success'
                        ? 'Done'
                        : item.status === 'error'
                          ? 'Failed'
                          : item.status === 'uploading'
                            ? 'Uploading...'
                            : 'Waiting'}
                    </span>
                  </div>
                  {item.status === 'uploading' ? (
                    <div className="h-1.5 w-full rounded-full bg-white">
                      <div className="h-1.5 rounded-full bg-[var(--gush-accent,#2f58c6)] transition-all" style={{ width: `${item.progress}%` }} />
                    </div>
                  ) : null}
                  {item.error ? <p className="mt-2 text-xs text-red-700">{item.error}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={files.length === 0 || uploadMutation.isPending}
            className="flex-1 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadMutation.isPending ? 'Uploading...' : `Start upload (${files.length})`}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="rounded-full border border-black/8 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
