"use client";

import { ArrowLeft, ArrowUpRight, Plus, Upload } from "lucide-react";

import {
  AdminMetricCard,
  AdminPageSection,
  adminInputClassName,
  adminSelectClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import {
  BulkUpdateFields,
  CreateEpisodeFields,
  EpisodePagination,
  EpisodeTable,
  QuickFilterChip,
} from "./blocks";

export function EpisodesHeaderActions({
  onBackToSeries,
  onOpenStorefront,
  onOpenBulkUpload,
  onOpenCreateEpisode,
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[auto_auto]">
      <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f8f8fa)] p-3 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          导航与查看
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBackToSeries}>
            <ArrowLeft className="size-4" />
            返回作品详情
          </Button>
          <Button type="button" variant="outline" onClick={onOpenStorefront}>
            <ArrowUpRight className="size-4" />
            查看前台页
          </Button>
        </div>
      </div>
      <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f8f8fa)] p-3 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          新增动作
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onOpenBulkUpload}>
            <Upload className="size-4" />
            批量上传
          </Button>
          <Button type="button" onClick={onOpenCreateEpisode}>
            <Plus className="size-4" />
            新增章节
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EpisodesSummaryCards({ pagination, pageStats }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      <AdminMetricCard
        label="当前章节数"
        value={String(pagination.total)}
        detail="当前筛选条件下的章节总数。"
        tone="accent"
      />
      <AdminMetricCard
        label="已开试看"
        value={String(pageStats.previewCount)}
        detail="已经配置试看页数的章节。"
      />
      <AdminMetricCard
        label="近期更新"
        value={String(pageStats.recentUpdateCount)}
        detail="近 30 天内更新或发布的章节。"
      />
      <AdminMetricCard
        label="已选章节"
        value={String(pageStats.selectedCount)}
        detail="当前勾选、可用于批量操作的章节数。"
      />
    </div>
  );
}

export function EpisodesWorkspaceSection({
  searchTerm,
  sortBy,
  sortOrder,
  pageSize,
  selectedIds,
  quickFilters,
  sortOptions,
  quickFilterId,
  episodesQueryErrorMessage,
  episodes,
  pagination,
  onSearchChange,
  onSortByChange,
  onSortOrderToggle,
  onOpenBulkUpdate,
  onAutoRenumber,
  onOpenDeleteSelected,
  onQuickFilter,
  tableProps,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
  reorderPending,
}) {
  return (
    <AdminPageSection
      title="章节工作台"
      description="搜索、筛选，然后在表格里直接调整标题、试看页数和顺序。"
      eyebrow="章节管理"
      action={
        <div className="rounded-[20px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f8f8fa)] p-2 shadow-[0_8px_20px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              data-testid="admin-episodes-bulk-edit"
              onClick={onOpenBulkUpdate}
              disabled={selectedIds.length === 0}
            >
              批量修改
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="admin-episodes-auto-renumber"
              onClick={onAutoRenumber}
              disabled={reorderPending}
            >
              重排章节号
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            查找与排序
          </p>
          <p className="mt-2 text-sm text-slate-600">
            先用搜索和排序缩小范围，再在表格里直接调整章节内容。
          </p>
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_180px]">
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索章节标题或章节编号..."
              className={adminInputClassName}
            />
            <select
              value={sortBy}
              onChange={(event) => onSortByChange(event.target.value)}
              className={adminSelectClassName}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={onSortOrderToggle}>
              {sortOrder === "asc" ? "当前升序" : "当前降序"}
            </Button>
          </div>
        </div>

        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            选择与批量处理
          </p>
          <p className="mt-2 text-sm text-slate-600">
            勾选后的章节可以统一修改，删除动作单独放在这里，避免误触。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-[0_6px_16px_rgba(15,23,42,0.025)]">
              已选 {selectedIds.length} 章
            </span>
            <Button
              type="button"
              variant="destructive"
              onClick={onOpenDeleteSelected}
              disabled={selectedIds.length === 0}
            >
              删除所选
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[24px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f8f8fa)] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          快速筛选
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <QuickFilterChip
              key={filter.id}
              filter={filter}
              active={quickFilterId === filter.id}
              onClick={() => onQuickFilter(filter)}
            />
          ))}
        </div>
      </div>

      {episodesQueryErrorMessage ? (
        <AdminPageSection
          title="加载失败"
          description={episodesQueryErrorMessage}
        />
      ) : episodes.length === 0 ? (
        <AdminPageSection
          title="当前视图下还没有章节"
          description="换个筛选条件，或者先新增第一章。"
        />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-[color:var(--gush-border)] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <EpisodeTable {...tableProps} />
          <EpisodePagination
            pagination={pagination}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            onPrevPage={onPrevPage}
            onNextPage={onNextPage}
          />
        </div>
      )}
    </AdminPageSection>
  );
}

export function CreateEpisodeModalContent({
  newEpisode,
  setNewEpisode,
  showCreateCommercialFields,
  setShowCreateCommercialFields,
  isPending,
  onCreate,
}) {
  return (
    <div className="space-y-4">
      <CreateEpisodeFields
        newEpisode={newEpisode}
        setNewEpisode={setNewEpisode}
        showCreateCommercialFields={showCreateCommercialFields}
        setShowCreateCommercialFields={setShowCreateCommercialFields}
      />

      <Button type="button" onClick={onCreate} disabled={isPending}>
        {isPending ? "创建中..." : "创建章节"}
      </Button>
    </div>
  );
}

export function BulkUpdateModalContent({
  selectedCount,
  bulkForm,
  setBulkForm,
  showBulkCommercialFields,
  setShowBulkCommercialFields,
  isPending,
  onApply,
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">
        把统一内容修改应用到 {selectedCount} 个已选章节。
      </p>

      <BulkUpdateFields
        bulkForm={bulkForm}
        setBulkForm={setBulkForm}
        showBulkCommercialFields={showBulkCommercialFields}
        setShowBulkCommercialFields={setShowBulkCommercialFields}
      />

      <Button
        type="button"
        data-testid="admin-episodes-bulk-apply"
        onClick={onApply}
        disabled={isPending}
      >
        {isPending ? "应用中..." : "应用批量修改"}
      </Button>
    </div>
  );
}
