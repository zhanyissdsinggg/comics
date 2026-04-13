"use client";

import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

import {
  AdminDataTable,
  AdminFormField,
  AdminTableHeader,
  AdminTableRow,
  adminCheckboxClassName,
  adminInputClassName,
  adminSelectClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import { formatDateTime } from "./utils";

export function QuickFilterChip({ filter, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-[color:var(--gush-border-strong)] bg-white text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
          : "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/78 text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950"
      }`}
    >
      {filter.label}
    </button>
  );
}

export function CommercialFieldsToggle({ expanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/78 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-white"
    >
      {expanded ? "收起次级发行设置" : "显示次级发行设置"}
    </button>
  );
}

export function CommercialFieldsPanel({ children }) {
  return (
    <div className="grid gap-4 rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02] md:grid-cols-2">
      {children}
    </div>
  );
}

export function EpisodeTable({
  seriesId,
  episodes,
  selectedSet,
  allCurrentPageSelected,
  isCanonicalNumberSort,
  reorderPending,
  getEpisodeDraftValue,
  setEpisodeDraftValue,
  commitEpisodeField,
  handleSelectAllCurrentPage,
  handleToggleSelect,
  handleMoveEpisode,
  openDeleteConfirm,
}) {
  return (
    <AdminDataTable>
      <table className="min-w-full">
        <AdminTableHeader>
          <tr>
            <th className="px-4 py-4">
              <input
                type="checkbox"
                checked={allCurrentPageSelected}
                onChange={handleSelectAllCurrentPage}
                className={adminCheckboxClassName}
                aria-label="选择当前页全部章节"
              />
            </th>
            <th className="px-4 py-4">章节号</th>
            <th className="px-4 py-4">标题</th>
            <th className="px-4 py-4">试看页数</th>
            <th className="px-4 py-4">更新时间</th>
            <th className="px-4 py-4">操作</th>
          </tr>
        </AdminTableHeader>
        <tbody>
          {episodes.map((episode) => (
            <AdminTableRow key={episode.id}>
              <td className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={selectedSet.has(episode.id)}
                  onChange={() => handleToggleSelect(episode.id)}
                  className={adminCheckboxClassName}
                  aria-label={`选择章节 ${episode.number}`}
                />
              </td>
              <td className="px-4 py-4">
                <div className="space-y-2">
                  <p className="font-semibold text-slate-950">#{episode.number}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => handleMoveEpisode(episode, "up")}
                      disabled={!isCanonicalNumberSort || reorderPending}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => handleMoveEpisode(episode, "down")}
                      disabled={!isCanonicalNumberSort || reorderPending}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={getEpisodeDraftValue(episode, "title")}
                    onChange={(event) => setEpisodeDraftValue(episode.id, "title", event.target.value)}
                    onBlur={() => commitEpisodeField(episode, "title")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                    className={`${adminInputClassName} min-w-[220px]`}
                  />
                  <p className="text-xs text-slate-500">{episode.id}</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <input
                  type="number"
                  min="0"
                  id={`preview-free-pages-${episode.id}`}
                  value={getEpisodeDraftValue(episode, "previewFreePages")}
                  onChange={(event) =>
                    setEpisodeDraftValue(episode.id, "previewFreePages", event.target.value)
                  }
                  onBlur={() => commitEpisodeField(episode, "previewFreePages", { type: "number" })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  className={`${adminInputClassName} w-32`}
                  aria-label={`章节 ${episode.number} 试看页数`}
                />
              </td>
              <td className="px-4 py-4">
                <div className="space-y-1 text-sm text-slate-600">
                  <p>更新于：{formatDateTime(episode.updatedAt)}</p>
                  <p className="text-xs text-slate-500">
                    发布于：{formatDateTime(episode.releasedAt)}
                  </p>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/read/${seriesId}/${episode.id}`, "_blank", "noopener,noreferrer")}
                  >
                    <BookOpen className="size-4" />
                    阅读页
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => openDeleteConfirm([episode.id])}
                  >
                    删除
                  </Button>
                </div>
              </td>
            </AdminTableRow>
          ))}
        </tbody>
      </table>
    </AdminDataTable>
  );
}

export function EpisodePagination({
  pagination,
  pageSize,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[color:var(--gush-border)] bg-white px-5 py-4 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
      <div>
        第 <span className="font-medium text-slate-950">{pagination.page}</span> 页，共{" "}
        {pagination.totalPages} 页，当前共{" "}
        <span className="font-medium text-slate-950">{pagination.total}</span> 章
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-10 rounded-full border border-[color:var(--gush-border)] bg-white px-3 text-sm text-slate-700 outline-none"
          >
            {[20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrevPage}
            disabled={!pagination.hasPrevPage}
          >
            上一页
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={!pagination.hasNextPage}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CreateEpisodeFields({
  newEpisode,
  setNewEpisode,
  showCreateCommercialFields,
  setShowCreateCommercialFields,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <AdminFormField label="章节号">
          <input
            id="new-episode-number"
            type="number"
            min="1"
            value={newEpisode.number}
            onChange={(event) =>
              setNewEpisode((current) => ({ ...current, number: event.target.value }))
            }
            className={adminInputClassName}
          />
        </AdminFormField>
        <AdminFormField label="标题">
          <input
            id="new-episode-title"
            type="text"
            value={newEpisode.title}
            onChange={(event) =>
              setNewEpisode((current) => ({ ...current, title: event.target.value }))
            }
            className={adminInputClassName}
          />
        </AdminFormField>
        <AdminFormField label="试看页数">
          <input
            id="new-episode-preview-free-pages"
            type="number"
            min="0"
            value={newEpisode.previewFreePages}
            onChange={(event) =>
              setNewEpisode((current) => ({ ...current, previewFreePages: event.target.value }))
            }
            className={adminInputClassName}
          />
        </AdminFormField>
      </div>

      <CommercialFieldsToggle
        expanded={showCreateCommercialFields}
        onToggle={() => setShowCreateCommercialFields((current) => !current)}
      />

      {showCreateCommercialFields ? (
        <CommercialFieldsPanel>
          <AdminFormField label="点数价格">
            <input
              id="new-episode-price-pts"
              type="number"
              min="0"
              value={newEpisode.pricePts}
              onChange={(event) =>
                setNewEpisode((current) => ({ ...current, pricePts: event.target.value }))
              }
              className={adminInputClassName}
            />
          </AdminFormField>
          <label className="flex items-center justify-between rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4 text-sm text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
            <span>启用免费等候</span>
            <input
              id="new-episode-ttf-eligible"
              type="checkbox"
              checked={newEpisode.ttfEligible}
              onChange={(event) =>
                setNewEpisode((current) => ({ ...current, ttfEligible: event.target.checked }))
              }
              className={adminCheckboxClassName}
            />
          </label>
        </CommercialFieldsPanel>
      ) : null}
    </div>
  );
}

export function BulkUpdateFields({
  bulkForm,
  setBulkForm,
  showBulkCommercialFields,
  setShowBulkCommercialFields,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <AdminFormField label="批量试看页数">
          <input
            id="bulk-preview-free-pages"
            type="number"
            min="0"
            value={bulkForm.previewFreePages}
            onChange={(event) =>
              setBulkForm((current) => ({ ...current, previewFreePages: event.target.value }))
            }
            className={adminInputClassName}
          />
        </AdminFormField>
      </div>

      <CommercialFieldsToggle
        expanded={showBulkCommercialFields}
        onToggle={() => setShowBulkCommercialFields((current) => !current)}
      />

      {showBulkCommercialFields ? (
        <CommercialFieldsPanel>
          <AdminFormField label="批量点数价格">
            <input
              id="bulk-price-pts"
              type="number"
              min="0"
              value={bulkForm.pricePts}
              onChange={(event) =>
                setBulkForm((current) => ({ ...current, pricePts: event.target.value }))
              }
              className={adminInputClassName}
            />
          </AdminFormField>
          <AdminFormField label="批量免费等候">
            <select
              id="bulk-ttf-eligible"
              value={bulkForm.ttfEligible}
              onChange={(event) =>
                setBulkForm((current) => ({ ...current, ttfEligible: event.target.value }))
              }
              className={adminSelectClassName}
            >
              <option value="unchanged">保持当前值</option>
              <option value="true">统一开启</option>
              <option value="false">统一关闭</option>
            </select>
          </AdminFormField>
        </CommercialFieldsPanel>
      ) : null}
    </div>
  );
}
