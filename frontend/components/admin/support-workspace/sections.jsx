"use client";

import { Mail, MessageSquare, RefreshCw, Trash2 } from "lucide-react";

import { AdminSelectionBar } from "@/components/admin/common/AdminSelectionBar";
import { AdminTableShell } from "@/components/admin/common/AdminTableShell";
import {
  AdminBadge,
  AdminDataTable,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
  adminCheckboxClassName,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Modal } from "@/components/admin/common/Modal";
import { Button } from "@/components/ui/button";

import {
  buildSupportMetricCards,
  formatDateTime,
  getMessagePreview,
  getStatusLabel,
  getStatusTone,
} from "./utils";

export function SupportSummaryCards({ total, openCount, pendingReplies }) {
  const cards = buildSupportMetricCards({ total, openCount, pendingReplies });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function SupportQueueSection(props) {
  const {
    searchTerm,
    onSearchTermChange,
    statusFilter,
    onStatusFilterChange,
    sortBy,
    onSortByChange,
    sortOrder,
    onToggleSortOrder,
    onReset,
    selectedIds,
    clearSelection,
    onOpenDeleteConfirm,
    deletePending,
    isError,
    errorMessage,
    onRetry,
    isLoading,
    hasItems,
    emptyMessage,
    pagination,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    tickets,
    selectedIdsSet,
    onSelectAll,
    onToggleSelect,
    onOpenReply,
    replyPending,
    onCloseTicket,
    closePending,
    statusOptions,
    replyEnabled,
    replyDisabledMessage,
  } = props;

  return (
    <AdminPageSection
      title="客服队列"
      description="按主题、用户或工单编号搜索，让操作行保持克制，把消息正文留给真正需要判断的人。"
      action={
        <Button type="button" variant="outline" onClick={onReset}>
          <RefreshCw className="size-4" />
          重置视图
        </Button>
      }
    >
      <div className="mb-6 rounded-[26px] border border-[color:var(--gush-border)] bg-[color:var(--gush-surface)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_220px_220px_auto]">
          <label className="relative">
            <input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="搜索工单编号、用户、主题、原消息或回复内容..."
              className={adminInputClassName}
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className={adminSelectClassName}
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value)}
            className={adminSelectClassName}
          >
            <option value="createdAt">创建时间</option>
            <option value="updatedAt">更新时间</option>
            <option value="status">状态</option>
          </select>

          <Button type="button" variant="outline" onClick={onToggleSortOrder}>
            {sortOrder === "asc" ? "最早创建优先" : "最新创建优先"}
          </Button>
        </div>
        {!replyEnabled && replyDisabledMessage ? (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm leading-6 text-amber-800">
            {replyDisabledMessage}
          </p>
        ) : null}
      </div>

      <AdminSelectionBar selectedCount={selectedIds.length} onClear={clearSelection}>
        <Button
          type="button"
          variant="destructive"
          onClick={onOpenDeleteConfirm}
          disabled={selectedIds.length === 0 || deletePending}
        >
          <Trash2 className="size-4" />
          删除已选
        </Button>
      </AdminSelectionBar>

      <AdminTableShell
        isError={isError}
        errorMessage={errorMessage}
        onRetry={onRetry}
        isLoading={isLoading}
        hasItems={hasItems}
        emptyMessage={emptyMessage}
        pagination={pagination}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      >
        <AdminDataTable className="border-0 shadow-none">
          <table className="w-full min-w-[980px]">
            <AdminTableHeader>
              <tr>
                <th className="px-4 py-4">
                  <input
                    type="checkbox"
                    aria-label="选择全部工单"
                    checked={tickets.length > 0 && selectedIds.length === tickets.length}
                    onChange={(event) => onSelectAll(event.target.checked)}
                    className={adminCheckboxClassName}
                  />
                </th>
                <th className="px-4 py-4">工单</th>
                <th className="px-4 py-4">读者</th>
                <th className="px-4 py-4">状态</th>
                <th className="px-4 py-4">创建时间</th>
                <th className="px-4 py-4">更新时间</th>
                <th className="px-4 py-4">操作</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {tickets.map((ticket) => (
                <AdminTableRow key={ticket.id}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      aria-label={`选择工单 ${ticket.id}`}
                      checked={selectedIdsSet.has(ticket.id)}
                      onChange={() => onToggleSelect(ticket.id)}
                      className={adminCheckboxClassName}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-950">{ticket.subject || "未命名工单"}</p>
                      <p className="text-xs text-slate-500">#{ticket.id}</p>
                      <p className="max-w-xl text-sm leading-6 text-slate-600">
                        {getMessagePreview(ticket.message)}
                      </p>
                      {ticket.adminReply ? (
                        <div className="rounded-[20px] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.95))] px-3.5 py-3 text-sm text-emerald-950 shadow-[0_8px_18px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                          <p className="font-medium">最近回复</p>
                          <p className="mt-1 leading-6">{getMessagePreview(ticket.adminReply, 160)}</p>
                          <p className="mt-1 text-xs text-emerald-800/80">
                            {ticket.adminRepliedAt ? formatDateTime(ticket.adminRepliedAt) : "刚刚更新"}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span>{ticket.userEmail || "未填写邮箱"}</span>
                      </div>
                      <p className="text-xs text-slate-500">用户编号：{ticket.userId || "-"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <AdminBadge tone={getStatusTone(ticket.status)}>
                      {getStatusLabel(ticket.status)}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDateTime(ticket.createdAt)}</td>
                  <td className="px-4 py-4 text-slate-600">{formatDateTime(ticket.updatedAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-start gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenReply(ticket)}
                        disabled={!replyEnabled || replyPending}
                      >
                        <MessageSquare className="size-4" />
                        {ticket.adminReply ? "更新回复" : "回复"}
                      </Button>

                      {String(ticket.status || "").toLowerCase() !== "closed" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onCloseTicket(ticket.id)}
                          disabled={closePending}
                        >
                          关闭工单
                        </Button>
                      ) : (
                        <AdminBadge tone="default">已关闭</AdminBadge>
                      )}
                    </div>
                  </td>
                </AdminTableRow>
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      </AdminTableShell>
    </AdminPageSection>
  );
}

export function SupportReplyModal({
  isOpen,
  selectedTicket,
  replyContent,
  onReplyContentChange,
  onClose,
  onSubmit,
  isPending,
  replyEnabled,
  replyDisabledMessage,
}) {
  return (
    <Modal
      isOpen={isOpen}
      title="回复工单"
      subtitle={
        selectedTicket
          ? `${selectedTicket.subject || "未命名工单"} · ${
              selectedTicket.userEmail || selectedTicket.userId || "未知读者"
            }`
          : ""
      }
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-4">
        {!replyEnabled && replyDisabledMessage ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
            {replyDisabledMessage}
          </div>
        ) : null}
        {selectedTicket ? (
          <div className="space-y-3">
            <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-950">原始消息</p>
              <p className="mt-2 leading-6">{selectedTicket.message || "未附带消息内容。"}</p>
            </div>

            {selectedTicket.adminReply ? (
              <div className="rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.95))] px-4 py-4 text-sm text-emerald-950 shadow-[0_8px_18px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                <p className="font-semibold">最近一次回复</p>
                <p className="mt-2 leading-6">{selectedTicket.adminReply}</p>
                <p className="mt-2 text-xs text-emerald-900/70">
                  {selectedTicket.adminRepliedAt
                    ? `发送时间：${formatDateTime(selectedTicket.adminRepliedAt)}`
                    : "发送时间暂未记录"}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <AdminFormField
          label={selectedTicket?.adminReply ? "更新回复内容" : "回复内容"}
          helperText="回复保持直接、克制，并准确回应读者这次提出的问题。发送后会覆盖当前工单的最近一次回复。"
        >
          <textarea
            value={replyContent}
            onChange={(event) => onReplyContentChange(event.target.value)}
            placeholder="输入你要发送给读者的回复..."
            rows={7}
            className={adminTextareaClassName}
            disabled={!replyEnabled}
          />
        </AdminFormField>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={!replyEnabled || !replyContent.trim() || isPending}
        >
          {isPending ? "发送中..." : "发送回复"}
        </Button>
      </div>
    </Modal>
  );
}
