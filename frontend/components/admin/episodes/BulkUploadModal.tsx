import React, { useCallback, useState } from 'react';
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

async function readResponseMessage(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const payload = await response.json();
    const message = payload?.message ?? payload?.error ?? payload?.details;

    if (Array.isArray(message)) {
      return message.find((item) => typeof item === 'string') || fallbackMessage;
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  } catch {
    // Ignore JSON parsing failures.
  }

  try {
    const text = await response.text();
    if (text.trim()) {
      return text.trim();
    }
  } catch {
    // Ignore text parsing failures.
  }

  return fallbackMessage;
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

      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
      const response = await fetch(`/api/admin/series/${seriesId}/episodes/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readResponseMessage(response, 'Upload failed.'));
      }

      return response.json();
    },
    onSuccess: () => {
      setUploadProgress((current) => current.map((item) => ({ ...item, status: 'success', progress: 100 })));
      setFeedback({ type: 'success', message: 'Bulk upload completed successfully.' });

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    },
    onError: (error: Error) => {
      setUploadProgress((current) =>
        current.map((item) => ({
          ...item,
          status: 'error',
          error: error.message,
        }))
      );
      setFeedback({ type: 'error', message: error.message || 'Upload failed.' });
    },
  });

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) {
      return;
    }

    const zipFiles = Array.from(selectedFiles).filter((file) => file.name.toLowerCase().endsWith('.zip'));

    if (zipFiles.length === 0) {
      setFeedback({ type: 'error', message: 'Select at least one ZIP file.' });
      return;
    }

    if (zipFiles.length > 50) {
      setFeedback({ type: 'error', message: 'You can upload up to 50 files at once.' });
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
    [handleFileSelect]
  );

  const handleUpload = () => {
    if (files.length === 0) {
      setFeedback({ type: 'error', message: 'Select files before uploading.' });
      return;
    }

    setFeedback({ type: '', message: '' });
    setUploadProgress((current) => current.map((item) => ({ ...item, status: 'uploading', progress: 0 })));

    const progressTimer = window.setInterval(() => {
      setUploadProgress((current) =>
        current.map((item) => ({
          ...item,
          progress: item.status === 'uploading' ? Math.min(item.progress + 20, 90) : item.progress,
        }))
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-800 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-100">Bulk Upload Episodes</h2>
            <p className="mt-1 text-sm text-neutral-400">Upload ZIP archives and create episodes in a single batch.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-700 hover:text-neutral-200 disabled:opacity-50"
            aria-label="Close bulk upload"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {feedback.message ? (
          <div
            className={`mb-4 rounded-lg border p-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="mb-6">
          <label className="mb-2 block text-sm text-neutral-400">Starting episode number</label>
          <input
            type="number"
            value={startNumber}
            onChange={(event) => setStartNumber(event.target.value)}
            disabled={uploadMutation.isPending}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100"
            placeholder="Optional. Leave blank to append automatically."
          />
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10 text-blue-300'
              : 'border-neutral-600 bg-neutral-900/50 text-neutral-400'
          }`}
        >
          <div className="mb-4 flex justify-center">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className="text-sm">Drop ZIP files here or choose them manually.</p>
          <p className="mt-2 text-xs text-neutral-500">
            Up to 50 ZIP files per upload. Keep each file under 50 MB.
          </p>
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
            className="mt-4 inline-block cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Choose files
          </label>
        </div>

        {uploadProgress.length > 0 ? (
          <div className="mt-6 space-y-2">
            <h3 className="mb-3 text-sm font-medium text-neutral-300">Files ({uploadProgress.length})</h3>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {uploadProgress.map((item, index) => (
                <div key={`${item.fileName}-${index}`} className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="flex-1 truncate text-sm text-neutral-300">{item.fileName}</span>
                    <span
                      className={`rounded px-2 py-1 text-xs ${
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
                        ? 'Success'
                        : item.status === 'error'
                          ? 'Failed'
                          : item.status === 'uploading'
                            ? 'Uploading...'
                            : 'Waiting'}
                    </span>
                  </div>
                  {item.status === 'uploading' ? (
                    <div className="h-1.5 w-full rounded-full bg-neutral-700">
                      <div
                        className="h-1.5 rounded-full bg-blue-600 transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  ) : null}
                  {item.error ? <p className="mt-1 text-xs text-red-400">{item.error}</p> : null}
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
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadMutation.isPending ? 'Uploading...' : `Start upload (${files.length})`}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="rounded-lg bg-neutral-700 px-4 py-2 text-neutral-300 transition hover:bg-neutral-600 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
