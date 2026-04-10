"use client";

/* eslint-disable @next/next/no-img-element */

import { Upload, X } from "lucide-react";

import {
  CREATE_FLOW_OPTIONS,
  formatSeriesStatusLabel,
  revokeObjectUrl,
  STATUS_OPTIONS,
} from "./utils";

export default function CreateSeriesModal(props) {
  const {
    isOpen,
    createForm,
    setCreateForm,
    closeCreateModal,
    isDragging,
    setIsDragging,
    handleCoverInput,
    suggestedSeriesId,
    handleCreate,
    isCreating,
  } = props;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,27,36,0.28)] p-4 backdrop-blur-sm"
      onClick={closeCreateModal}
    >
      <div
        className="w-full max-w-2xl rounded-[28px] border border-[color:var(--gush-border)] bg-white/96 p-6 shadow-[var(--gush-shadow-panel)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">新增作品</h3>
            <p className="mt-1 text-sm text-slate-600">先补齐标题、署名和封面，再决定下一步去详情页还是章节管理。</p>
          </div>
          <button
            type="button"
            onClick={closeCreateModal}
            className="rounded-full border border-[color:var(--gush-border)] bg-white p-2 text-slate-500 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,1.1fr]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">封面图片</label>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                handleCoverInput(event.dataTransfer.files?.[0]);
              }}
              className={`rounded-[28px] border border-dashed p-4 transition ${
                isDragging
                  ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)]"
                  : "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]"
              }`}
            >
              {createForm.coverPreviewUrl ? (
                <div className="space-y-3">
                  <img src={createForm.coverPreviewUrl} alt="封面预览" className="aspect-[2/3] w-full rounded-[24px] object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm((current) => {
                        revokeObjectUrl(current.coverPreviewUrl);
                        return { ...current, coverFile: null, coverPreviewUrl: "" };
                      })
                    }
                    className="w-full rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
                  >
                    移除封面
                  </button>
                </div>
              ) : (
                <label className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-[color:var(--gush-border)] bg-white px-6 text-center text-slate-500">
                  <Upload size={28} className="text-slate-950" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">把图片拖到这里，或点击上传</p>
                    <p className="mt-1 text-xs text-slate-500">支持 JPG、PNG、GIF，大小不超过 10MB。</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleCoverInput(event.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">作品标题 *</span>
              <input
                value={createForm.title}
                onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="例如：午夜契约"
                className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]"
              />
              <span className="text-xs text-slate-500">建议作品 ID：{suggestedSeriesId}</span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">创作者 / 团队署名</span>
              <input
                value={createForm.author}
                onChange={(event) => setCreateForm((current) => ({ ...current, author: event.target.value }))}
                placeholder="例如：Studio LICO"
                className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]"
              />
              <span className="text-xs text-slate-500">尽早补上公开署名，创作者页和作品页才会保持一致。</span>
            </label>

            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">作品形式</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreateForm((current) => ({ ...current, type: "comic" }))}
                  className={`rounded-[20px] border px-4 py-3 text-sm font-semibold transition ${
                    createForm.type === "comic"
                      ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950"
                      : "border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"
                  }`}
                >
                  漫画
                </button>
                <button
                  type="button"
                  onClick={() => setCreateForm((current) => ({ ...current, type: "novel" }))}
                  className={`rounded-[20px] border px-4 py-3 text-sm font-semibold transition ${
                    createForm.type === "novel"
                      ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950"
                      : "border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"
                  }`}
                >
                  小说
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-[20px] border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={createForm.adult}
                onChange={(event) => setCreateForm((current) => ({ ...current, adult: event.target.checked }))}
                className="h-4 w-4 rounded border-black/20 bg-white text-slate-950"
              />
              <span>18+ 作品</span>
            </label>

            <label className="flex items-center gap-3 rounded-[20px] border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={createForm.isPublished}
                onChange={(event) => setCreateForm((current) => ({ ...current, isPublished: event.target.checked }))}
                className="h-4 w-4 rounded border-black/20 bg-white text-slate-950"
              />
              <span>创建后立即发布</span>
            </label>

            <div className="grid gap-3">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">连载状态</span>
                <select
                  value={createForm.status}
                  onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatSeriesStatusLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">作品简介</span>
              <textarea
                value={createForm.description}
                onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="写一段清楚、克制的作品简介。"
                rows={4}
                className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">题材与标签</span>
              <input
                value={createForm.genres}
                onChange={(event) => setCreateForm((current) => ({ ...current, genres: event.target.value }))}
                placeholder="动作、恋爱、奇幻"
                className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]"
              />
            </label>

            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">创建后前往</span>
              <div className="grid gap-2">
                {CREATE_FLOW_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCreateForm((current) => ({ ...current, openAfterCreate: option.value }))}
                    className={`rounded-[20px] border px-4 py-3 text-left transition ${
                      createForm.openAfterCreate === option.value
                        ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950"
                        : "border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"
                    }`}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{option.helper}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeCreateModal}
                className="flex-1 rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
