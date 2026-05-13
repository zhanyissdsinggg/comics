"use client";

/* eslint-disable @next/next/no-img-element */

import {
  BookOpen,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";

import {
  adminCheckboxClassName,
  adminInputClassName,
  adminSelectClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import { getAdminSeriesReadiness } from "../../../lib/adminSeriesReadiness";

import {
  formatSeriesStatusLabel,
  formatSeriesTypeLabel,
  formatUpdatedAt,
  STATUS_OPTIONS,
} from "./utils";

function getReadinessToneClasses(tone) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "cyan") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

const actionGroupClassName =
  "flex flex-wrap gap-2 lg:justify-end [&_button]:min-w-[98px] [&_button]:justify-center";

const primaryActionGroupClassName =
  "flex flex-wrap gap-2 lg:justify-end [&_button]:min-w-[104px] [&_button]:justify-center";

const secondaryActionGroupClassName =
  "flex flex-wrap gap-2 lg:justify-end [&_button]:min-w-[98px] [&_button]:justify-center";

const quietDangerActionGroupClassName =
  "flex justify-end [&_button]:min-w-[98px] [&_button]:justify-center";

const statCellClassName =
  "rounded-[18px] border border-[color:var(--gush-border)] bg-white/80 px-3 py-3 shadow-[0_6px_14px_rgba(15,23,42,0.03)]";

export default function SeriesCard(props) {
  const {
    series,
    viewMode,
    isSelected,
    isEditing,
    editDraft,
    isSaving,
    onSelect,
    onStartEdit,
    onEditDraftChange,
    onSaveEdit,
    onCancelEdit,
    onOpenDetails,
    onOpenEpisodes,
    onOpenFrontend,
    onTogglePublish,
    onDuplicate,
    onDelete,
  } = props;

  const isList = viewMode === "list";
  const readiness = getAdminSeriesReadiness(series);
  const creatorLine = series.creatorLabel || "创作者署名待补充";
  const readinessHint =
    readiness.missingCount > 0
      ? `优先补齐 ${readiness.topIssues.join("、")}`
      : "已经具备前台展示所需的基础信息";
  const operationalHighlights = [
    series.episodeCount > 0 ? `${series.episodeCount} 章` : "尚未添加章节",
    series.coverUrl ? "封面已补齐" : "缺少封面",
    series.creatorLabel ? "署名已补齐" : "缺少创作者署名",
  ];

  return (
    <article
      className={`rounded-[30px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,246,248,0.94))] p-4 shadow-[0_16px_36px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.02] transition ${
        isSelected
          ? "border-[color:var(--gush-border-strong)] shadow-[0_18px_40px_rgba(15,23,42,0.07)]"
          : "border-[color:var(--gush-border)]"
      }`}
      data-testid={`admin-series-card-${series.id}`}
    >
      <div
        className={`grid gap-4 ${
          isList
            ? "lg:grid-cols-[auto,84px,1.6fr,1fr,auto] lg:items-center"
            : ""
        }`}
      >
        <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] shadow-[0_10px_22px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(series.id)}
            className={`${adminCheckboxClassName} cursor-pointer`}
          />
        </label>

        <div
          className={`${
            isList ? "h-24 w-16" : "aspect-[2/3] w-full"
          } overflow-hidden rounded-[24px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,244,246,0.96))] shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]`}
        >
          {series.coverUrl ? (
            <img
              src={series.coverUrl}
              alt={`${series.title}封面`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <ImageIcon size={isList ? 24 : 40} />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,245,247,0.92))] px-2.5 py-1 text-slate-700">
              {formatSeriesTypeLabel(series.type)}
            </span>
            <span className="rounded-full border border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,245,249,0.92))] px-2.5 py-1 text-slate-950">
              {formatSeriesStatusLabel(series.status)}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 ${getReadinessToneClasses(readiness.tone)}`}
            >
              {readiness.statusLabel}
            </span>
            {series.adult ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">
                18+
              </span>
            ) : null}
            {!series.isPublished ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                草稿
              </span>
            ) : null}
          </div>

          {isEditing ? (
            <div className="space-y-3 rounded-[24px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,246,248,0.92))] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
              <input
                value={editDraft?.title || ""}
                onChange={(event) =>
                  onEditDraftChange({ ...editDraft, title: event.target.value })
                }
                className={adminInputClassName}
                placeholder="作品标题"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={editDraft?.status || "Ongoing"}
                  onChange={(event) =>
                    onEditDraftChange({
                      ...editDraft,
                      status: event.target.value,
                    })
                  }
                  className={adminSelectClassName}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatSeriesStatusLabel(option)}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-3 rounded-[20px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] px-4 py-3 text-sm text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
                  <input
                    type="checkbox"
                    checked={Boolean(editDraft?.adult)}
                    onChange={(event) =>
                      onEditDraftChange({
                        ...editDraft,
                        adult: event.target.checked,
                      })
                    }
                    className={adminCheckboxClassName}
                  />
                  <span>18+ 作品</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.94))] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      作品概览
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenDetails(series.id)}
                      className="mt-2 text-left text-lg font-semibold text-slate-950 transition hover:text-slate-700"
                    >
                      {series.title}
                    </button>
                    <p className="mt-1 text-xs text-slate-400">
                      作品编号：{series.id}
                    </p>
                  </div>
                  <div
                    className={`rounded-[18px] border px-3 py-2 text-right ${getReadinessToneClasses(readiness.tone)}`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                      前台准备度
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {readiness.score} 分
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-[color:var(--gush-border)] bg-white/80 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      创作者
                    </p>
                    <p
                      className={`mt-2 text-sm ${series.creatorLabel ? "font-medium text-slate-950" : "text-amber-700"}`}
                    >
                      {creatorLine}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[color:var(--gush-border)] bg-white/80 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      当前状态
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-950">
                      {readinessHint}
                    </p>
                  </div>
                </div>

                <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
                  {series.description || "作品简介待补充。"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium">
                  {operationalHighlights.map((item) => (
                    <span
                      key={`${series.id}-${item}`}
                      className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1 text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                <span className="rounded-full border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,245,247,0.92))] px-2.5 py-1 text-slate-600">
                  {series.updatedAt
                    ? `最近更新 ${formatUpdatedAt(series.updatedAt, true)}`
                    : "暂无更新时间"}
                </span>
                {!series.creatorLabel ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    缺少创作者署名
                  </span>
                ) : null}
                {!series.coverUrl ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    缺少封面
                  </span>
                ) : null}
                {!series.description?.trim() ? (
                  <span className="rounded-full border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,245,247,0.92))] px-2.5 py-1 text-slate-600">
                    仍需补简介
                  </span>
                ) : null}
                {!series.genres.length ? (
                  <span className="rounded-full border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,245,247,0.92))] px-2.5 py-1 text-slate-600">
                    仍需补标签
                  </span>
                ) : null}
                {series.episodeCount === 0 ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    还没有章节
                  </span>
                ) : null}
                {series.genres.slice(0, 3).map((genre) => (
                  <span
                    key={`${series.id}-${genre}`}
                    className="rounded-full border border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,245,249,0.92))] px-2.5 py-1 text-slate-950"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,246,248,0.92))] p-4 text-sm shadow-[0_12px_28px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02] lg:grid-cols-2">
          <div className={statCellClassName}>
            <p className="text-slate-500">章节数</p>
            <p className="mt-1 font-semibold text-slate-950">
              {series.episodeCount || 0}
            </p>
          </div>
          <div className={statCellClassName}>
            <p className="text-slate-500">最近更新</p>
            <p className="mt-1 font-semibold text-slate-950">
              {formatUpdatedAt(series.updatedAt, true)}
            </p>
          </div>
          <div className={statCellClassName}>
            <p className="text-slate-500">封面</p>
            <p className="mt-1 font-semibold text-slate-950">
              {series.coverUrl ? "已补齐" : "待补齐"}
            </p>
          </div>
          <div className={statCellClassName}>
            <p className="text-slate-500">发布状态</p>
            <p className="mt-1 font-semibold text-slate-950">
              {series.isPublished ? "已发布" : "草稿"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:min-w-[258px] lg:items-stretch">
          {isEditing ? (
            <div className={actionGroupClassName}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onCancelEdit}
                disabled={isSaving}
                className="min-w-[104px] justify-center"
                data-testid={`admin-series-card-${series.id}-edit-cancel`}
              >
                取消
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSaveEdit}
                disabled={isSaving}
                className="min-w-[104px] justify-center"
                data-testid={`admin-series-card-${series.id}-edit-save`}
              >
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.94))] p-3 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  主操作
                </p>
                <div className={primaryActionGroupClassName}>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenDetails(series.id)}
                    title="查看详情"
                    data-testid={`admin-series-card-${series.id}-detail`}
                  >
                    <Edit className="size-4" />
                    详情
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenEpisodes(series.id)}
                    title="管理章节"
                    data-testid={`admin-series-card-${series.id}-episodes`}
                  >
                    <BookOpen className="size-4" />
                    章节
                  </Button>
                  <Button
                    type="button"
                    variant={series.isPublished ? "secondary" : "default"}
                    size="sm"
                    onClick={() => onTogglePublish(series)}
                    title={series.isPublished ? "转为草稿" : "立刻发布"}
                    data-testid={`admin-series-card-${series.id}-publish-toggle`}
                  >
                    {series.isPublished ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                    {series.isPublished ? "转草稿" : "发布"}
                  </Button>
                </div>
              </div>

              <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.94))] p-3 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  辅助操作
                </p>
                <div className={secondaryActionGroupClassName}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onStartEdit(series)}
                    title="快速编辑"
                    data-testid={`admin-series-card-${series.id}-quick-edit`}
                  >
                    <Edit className="size-4" />
                    快速编辑
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenFrontend(series.id)}
                    disabled={!series.isPublished}
                    title={
                      series.isPublished
                        ? "查看前台作品页"
                        : "草稿状态下不能直接打开前台页"
                    }
                    data-testid={`admin-series-card-${series.id}-storefront`}
                  >
                    <ExternalLink className="size-4" />
                    前台页
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDuplicate(series)}
                    title="复制作品"
                    data-testid={`admin-series-card-${series.id}-duplicate`}
                  >
                    <Copy className="size-4" />
                    复制
                  </Button>
                </div>
              </div>

              <div className="rounded-[22px] border border-rose-200 bg-rose-50/55 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500">
                  危险操作
                </p>
                <div className={quietDangerActionGroupClassName}>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(series)}
                    title="删除作品"
                    data-testid={`admin-series-card-${series.id}-delete`}
                  >
                    <Trash2 className="size-4" />
                    删除
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
