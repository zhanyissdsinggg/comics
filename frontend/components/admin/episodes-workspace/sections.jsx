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
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--gush-border)] bg-white/78 p-1.5">
        <Button type="button" variant="ghost" onClick={onBackToSeries}>
          <ArrowLeft className="size-4" />
          返回作品详情
        </Button>
        <Button type="button" variant="ghost" onClick={onOpenStorefront}>
          <ArrowUpRight className="size-4" />
          查看前台页
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--gush-border)] bg-white/88 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
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
      description="先按标题搜索，再用轻量筛选收窄范围，最后直接在表格里完成标题、试看页数和章节顺序调整。"
      action={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onOpenBulkUpdate}
            disabled={selectedIds.length === 0}
          >
            批量修改
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onAutoRenumber}
            disabled={reorderPending}
          >
            自动重排章节号
          </Button>
        </div>
      }
    >
      <div className="mb-6 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_220px_180px]">
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索章节标题或章节 ID..."
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

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              已选 {selectedIds.length} 章
            </span>
            <Button
              type="button"
              variant="destructive"
              onClick={onOpenDeleteSelected}
              disabled={selectedIds.length === 0}
            >
              删除所选章节
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <QuickFilterChip
            key={filter.id}
            filter={filter}
            active={quickFilterId === filter.id}
            onClick={() => onQuickFilter(filter)}
          />
        ))}
      </div>

      {episodesQueryErrorMessage ? (
        <AdminPageSection title="加载失败" description={episodesQueryErrorMessage} />
      ) : episodes.length === 0 ? (
        <AdminPageSection
          title="当前视图下还没有章节"
          description="换一个筛选条件，或者先新增第一章开始处理。"
        />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-[color:var(--gush-border)] bg-white/92 shadow-[var(--gush-shadow-soft)]">
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

      <Button type="button" onClick={onApply} disabled={isPending}>
        {isPending ? "应用中..." : "应用批量修改"}
      </Button>
    </div>
  );
}
