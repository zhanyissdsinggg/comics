"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Image as ImageIcon,
  PencilLine,
  Plus,
  Save,
  Users,
} from "lucide-react";

import {
  AdminBadge,
  AdminFormField,
  AdminKeyValueList,
  AdminMetricCard,
  AdminPageSection,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CreditDraftCard, ReadinessCheckCard, StatusToggleCard } from "./blocks";

function getReadinessTone(tone) {
  if (tone === "emerald") {
    return "success";
  }
  if (tone === "amber") {
    return "warning";
  }
  if (tone === "rose") {
    return "danger";
  }
  return "accent";
}

export function SeriesHeaderActions({
  onBackToList,
  onOpenEpisodes,
  onOpenStorefront,
  isEditing,
  onStartEditing,
  onCancelEditing,
  onSave,
  overallDirty,
  isSaving,
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--gush-border)] bg-white/78 p-1.5">
        <Button type="button" variant="ghost" onClick={onBackToList}>
          <ArrowLeft className="size-4" />
          返回作品列表
        </Button>
        <Button type="button" variant="ghost" onClick={onOpenEpisodes}>
          <BookOpen className="size-4" />
          章节管理
        </Button>
        <Button type="button" variant="ghost" onClick={onOpenStorefront}>
          <ArrowUpRight className="size-4" />
          查看前台页
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--gush-border)] bg-white/88 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
        {isEditing ? (
          <>
            <Button type="button" variant="secondary" onClick={onCancelEditing}>
              取消
            </Button>
            <Button type="button" onClick={onSave} disabled={!overallDirty || isSaving}>
              <Save className="size-4" />
              {isSaving ? "保存中..." : "保存更改"}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={onStartEditing}>
            <PencilLine className="size-4" />
            编辑详情
          </Button>
        )}
      </div>
    </div>
  );
}

export function SummaryCardsSection({ cards }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function BasicInformationSection({
  formData,
  isEditing,
  onFieldChange,
  typeOptions,
  statusOptions,
}) {
  return (
    <AdminPageSection
      title="基础信息"
      description="把标题、简介和标签收干净，前台发现流和作品详情页才会更可信。"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminFormField label="作品标题">
          <input
            type="text"
            value={formData.title}
            onChange={onFieldChange("title")}
            disabled={!isEditing}
            className={adminInputClassName}
          />
        </AdminFormField>
        <AdminFormField label="作品形式">
          <select
            value={formData.type}
            onChange={onFieldChange("type")}
            disabled={!isEditing}
            className={adminSelectClassName}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdminFormField>
        <AdminFormField label="连载状态">
          <select
            value={formData.status}
            onChange={onFieldChange("status")}
            disabled={!isEditing}
            className={adminSelectClassName}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdminFormField>
      </div>

      <div className="mt-5">
        <AdminFormField label="作品简介">
          <textarea
            value={formData.description}
            onChange={onFieldChange("description")}
            disabled={!isEditing}
            rows={6}
            className={adminTextareaClassName}
          />
        </AdminFormField>
      </div>

      <div className="mt-5">
        <AdminFormField label="题材与标签" helperText="多个标签请用逗号分隔。">
          <input
            type="text"
            value={formData.genres}
            onChange={onFieldChange("genres")}
            disabled={!isEditing}
            className={adminInputClassName}
          />
        </AdminFormField>
      </div>
    </AdminPageSection>
  );
}

export function CoverSection({
  formData,
  isEditing,
  uploadPending,
  onFieldChange,
  onCoverUpload,
}) {
  return (
    <AdminPageSection
      title="封面"
      description="一张稳定的封面，比花哨的后台指标更能提升前台信任感。"
    >
      <div className="overflow-hidden rounded-[26px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]">
        {formData.coverUrl ? (
          <img
            src={formData.coverUrl}
            alt={`${formData.title || "作品"}封面`}
            className="aspect-[2/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[2/3] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500">
            <ImageIcon size={28} />
            <span>还没有封面图片。</span>
          </div>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <AdminFormField label="封面链接">
          <input
            type="url"
            value={formData.coverUrl}
            onChange={onFieldChange("coverUrl")}
            disabled={!isEditing}
            className={adminInputClassName}
          />
        </AdminFormField>
        <AdminFormField
          label="封面风格备注"
          helperText="可选填写，例如暖色、冷调、悬疑、压抑等编辑备注。"
        >
          <input
            type="text"
            value={formData.coverTone}
            onChange={onFieldChange("coverTone")}
            disabled={!isEditing}
            className={adminInputClassName}
          />
        </AdminFormField>
        {isEditing ? (
          <label className="block rounded-[22px] border border-dashed border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-950">上传新封面</span>
            <span className="mt-1 block text-xs text-slate-500">
              支持 JPG、PNG、GIF、WEBP，大小不能超过 10MB。
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={onCoverUpload}
              disabled={uploadPending}
              className="mt-4 block w-full text-xs text-slate-500"
            />
          </label>
        ) : null}
      </div>
    </AdminPageSection>
  );
}

export function ReadinessSection({ readiness }) {
  return (
    <AdminPageSection
      title="前台就绪度"
      description="快速看出还缺哪些地方会拖累前台作品页。"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-slate-950">{readiness.score}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{readiness.summary}</p>
        </div>
        <AdminBadge tone={getReadinessTone(readiness.tone)}>{readiness.statusLabel}</AdminBadge>
      </div>

      <div className="mt-4 space-y-2">
        {readiness.checks.map((item) => (
          <ReadinessCheckCard key={item.id} item={item} />
        ))}
      </div>
    </AdminPageSection>
  );
}

export function RecordInfoSection({ items }) {
  return (
    <AdminPageSection
      title="记录信息"
      description="用来核对这部作品当前的后台记录状态。"
    >
      <AdminKeyValueList items={items} />
    </AdminPageSection>
  );
}

export function CreditsSection({
  creatorPreviewLabel,
  publicCredits,
  hasLegacyAuthorFallback,
  creditsDraft,
  isCreditsEditing,
  creditsDirty,
  isSaving,
  roleOptions,
  typeOptions,
  loading,
  errorMessage,
  onStartEditing,
  onCancelEditing,
  onSave,
  onAddCredit,
  onRemoveCredit,
  onFieldChange,
}) {
  return (
    <AdminPageSection
      title="创作者署名与 credits"
      description="这里维护的才是作品页和创作者页真正会使用的公开署名，不要再只改旧 author 字段了。"
      action={
        <div className="flex flex-wrap gap-2">
          {isCreditsEditing ? (
            <>
              <Button type="button" variant="secondary" onClick={onCancelEditing}>
                取消
              </Button>
              <Button type="button" onClick={onSave} disabled={!creditsDirty || isSaving}>
                <Save className="size-4" />
                {isSaving ? "保存中..." : "保存署名"}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={onStartEditing}>
              <Users className="size-4" />
              编辑署名
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onAddCredit}>
            <Plus className="size-4" />
            添加署名
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4">
          <p className="text-sm font-semibold text-slate-950">当前前台署名</p>
          <p className="mt-2 text-base text-slate-700">{creatorPreviewLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminBadge tone={publicCredits.length > 0 ? "success" : "warning"}>
              {publicCredits.length > 0
                ? `${publicCredits.length} 条公开署名`
                : "还没有公开署名"}
            </AdminBadge>
            {hasLegacyAuthorFallback ? (
              <AdminBadge tone="warning">仍在使用旧 author 兜底</AdminBadge>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-8 text-sm text-slate-500">
            正在加载创作者署名...
          </div>
        ) : errorMessage ? (
          <div className="rounded-[24px] border border-red-200 bg-red-50/90 px-4 py-5 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : (
          creditsDraft.map((credit, index) => (
            <CreditDraftCard
              key={credit.id}
              credit={credit}
              index={index}
              isEditing={isCreditsEditing}
              roleOptions={roleOptions}
              typeOptions={typeOptions}
              onFieldChange={onFieldChange}
              onRemove={onRemoveCredit}
            />
          ))
        )}
      </div>
    </AdminPageSection>
  );
}

export function PublishingSection({ formData, isEditing, onFieldChange }) {
  return (
    <AdminPageSection
      title="发布设置"
      description="发布状态和分级限制保持简单明确即可。"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <StatusToggleCard
          label="前台可见"
          checked={formData.isPublished}
          onChange={onFieldChange("isPublished")}
          disabled={!isEditing}
        />
        <StatusToggleCard
          label="18+ 作品"
          checked={formData.adult}
          onChange={onFieldChange("adult")}
          disabled={!isEditing}
        />
      </div>
    </AdminPageSection>
  );
}

export function LegacyAuthorNotice({ visible }) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-[24px] border px-5 py-4 text-sm leading-6 shadow-[0_10px_24px_rgba(15,23,42,0.03)]",
        "border-amber-200 bg-amber-50/90 text-amber-800",
      )}
    >
      当前前台署名仍由旧 author 字段兼容兜底。把这部作品迁到真实 credits 之后，
      创作者页、作品页头部和后台巡检才会完全对齐。
    </div>
  );
}
