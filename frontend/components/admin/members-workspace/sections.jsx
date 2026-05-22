"use client";

import {
  Copy,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCcw,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

import { AdminListToolbar } from "@/components/admin/common/AdminListToolbar";
import { AdminSortModal } from "@/components/admin/common/AdminSortModal";
import { AdminTableShell } from "@/components/admin/common/AdminTableShell";
import {
  AdminBadge,
  AdminDataTable,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  AdminTableHeader,
  AdminTableRow,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import {
  formatDate,
  formatRole,
  getKeySlotLabel,
  getKeySlotTone,
  getSourceLabel,
  ROLE_LABELS,
  STATUS_LABELS,
} from "./utils";

export function MembersSummaryCards({
  paginationTotal,
  enabledCount,
  boundSlotsCount,
  totpEnabledCount,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <AdminMetricCard
        label="成员总数"
        value={String(paginationTotal)}
        detail="包括手动创建成员和槽位同步成员。"
        tone="accent"
      />
      <AdminMetricCard
        label="当前启用"
        value={String(enabledCount)}
        detail="仍可进入后台的成员数量。"
      />
      <AdminMetricCard
        label="已启用两步验证"
        value={String(totpEnabledCount)}
        detail={`其中 ${boundSlotsCount} 个成员已绑定环境槽位。`}
      />
    </div>
  );
}

export function MembersDirectorySection(props) {
  const {
    searchTerm,
    onSearchTermChange,
    sortOrder,
    onToggleSortOrder,
    onOpenSort,
    onSync,
    syncPending,
    onOpenCreate,
    membersState,
    members,
    pagination,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    onRetry,
    onOpenEdit,
    onToggleStatus,
    statusPending,
    onResetTotp,
    resetTotpPending,
    onClearTotp,
    clearTotpPending,
  } = props;

  return (
    <AdminPageSection
      title="成员目录"
      description="看成员、角色、槽位和两步验证。"
      eyebrow="团队管理"
    >
      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            查找与排序
          </p>
          <p className="mt-2 text-sm text-slate-600">
            先按成员、邮箱或角色缩小范围，再按时间顺序复核后台团队状态。
          </p>
          <div className="mt-4">
            <AdminListToolbar
              searchTerm={searchTerm}
              onSearchTermChange={onSearchTermChange}
              searchPlaceholder="搜索成员名称、邮箱、角色或成员编号"
              onOpenFilters={onOpenSort}
              sortOrder={sortOrder}
              onToggleSortOrder={onToggleSortOrder}
              filtersLabel="排序"
              ascendingLabel="较早优先"
              descendingLabel="最新优先"
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            成员动作
          </p>
          <p className="mt-2 text-sm text-slate-600">
            先同步环境槽位，再补齐成员资料；新建入口单独放在这里更稳。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSync}
              disabled={syncPending}
              data-testid="admin-members-sync-slots"
            >
              <RefreshCcw className="size-4" />
              {syncPending ? "同步中..." : "同步槽位"}
            </Button>
            <Button type="button" onClick={onOpenCreate}>
              <Plus className="size-4" />
              新建成员
            </Button>
          </div>
        </div>
      </div>

      <AdminTableShell
        isError={membersState.isError}
        errorMessage={membersState.errorMessage}
        onRetry={onRetry}
        isLoading={membersState.isLoading}
        hasItems={members.length > 0}
        emptyMessage="还没有后台成员。先同步槽位，或手动新增成员。"
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
                <th className="px-4 py-4">成员</th>
                <th className="px-4 py-4">角色</th>
                <th className="px-4 py-4">状态</th>
                <th className="px-4 py-4">槽位</th>
                <th className="px-4 py-4">两步验证</th>
                <th className="px-4 py-4">最近登录</th>
                <th className="px-4 py-4">操作</th>
              </tr>
            </AdminTableHeader>
            <tbody>
              {members.map((member) => (
                <AdminTableRow key={member.id}>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-950">
                        {member.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {member.email || "未填写邮箱"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {getSourceLabel(member.source)} · {member.id}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <AdminBadge tone="accent">
                      {formatRole(member.role)}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-4">
                    <AdminBadge
                      tone={member.status === "active" ? "success" : "default"}
                    >
                      {STATUS_LABELS[member.status] || member.status}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <AdminBadge tone={getKeySlotTone(member.keySlotStatus)}>
                        {getKeySlotLabel(member)}
                      </AdminBadge>
                      {member.keySlot ? (
                        <p className="text-xs text-slate-500">
                          {member.keySlotStatus === "assigned"
                            ? "已和环境槽位对齐"
                            : member.keySlotStatus === "missing"
                              ? "当前环境缺少这个槽位"
                              : "暂未绑定"}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <AdminBadge
                        tone={member.totpEnabled ? "success" : "default"}
                      >
                        {member.totpEnabled ? "已启用" : "未启用"}
                      </AdminBadge>
                      <p className="text-xs text-slate-500">
                        {member.hasTotpSecret ? "已生成密钥" : "未生成密钥"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatDate(member.lastLoginAt)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenEdit(member)}
                      >
                        编辑
                      </Button>
                      <Button
                        type="button"
                        variant={
                          member.status === "active" ? "secondary" : "outline"
                        }
                        size="sm"
                        data-testid={`admin-member-status-toggle-${member.id}`}
                        onClick={() =>
                          onToggleStatus({
                            id: member.id,
                            status:
                              member.status === "active"
                                ? "disabled"
                                : "active",
                          })
                        }
                        disabled={statusPending}
                      >
                        {member.status === "active" ? (
                          <>
                            <PauseCircle className="size-4" />
                            停用
                          </>
                        ) : (
                          <>
                            <PlayCircle className="size-4" />
                            启用
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onResetTotp(member.id)}
                        disabled={resetTotpPending}
                      >
                        <ShieldCheck className="size-4" />
                        重置验证
                      </Button>
                      {member.hasTotpSecret ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onClearTotp(member.id)}
                          disabled={clearTotpPending}
                        >
                          <ShieldOff className="size-4" />
                          清除验证
                        </Button>
                      ) : null}
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

export function MembersGuideSection() {
  const items = [
    {
      title: "先同步，再补齐信息",
      description: "先把环境槽位同步进来，再补名称、邮箱和角色。",
    },
    {
      title: "角色和状态都在这里维护",
      description: "菜单权限跟着角色走，启用和停用也在这里改。",
    },
    {
      title: "新密钥只展示一次",
      description: "重置后立即保存到验证器，关闭后不会再明文返回。",
    },
  ];

  return (
    <AdminPageSection
      title="操作要点"
      description="只保留最关键的三件事。"
      accent="amber"
      eyebrow="使用说明"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]"
          >
            <p className="text-sm font-semibold text-slate-950">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </AdminPageSection>
  );
}

export function MembersSortDialog({
  isOpen,
  onClose,
  sortBy,
  onSortByChange,
  options,
}) {
  return (
    <AdminSortModal
      isOpen={isOpen}
      onClose={onClose}
      sortBy={sortBy}
      onSortByChange={onSortByChange}
      options={options}
      title="排序后台成员"
      label="排序方式"
      actionLabel="完成"
    />
  );
}

export function MemberEditorModalContent({
  editingMember,
  form,
  setForm,
  metaQueryData,
  keySlotOptions,
  onClose,
  onSave,
  isPending,
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <AdminFormField
          label="成员名称"
          helperText="用于后台显示、日志和会话卡片。"
        >
          <input
            className={adminInputClassName}
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="例如：内容主编"
          />
        </AdminFormField>

        <AdminFormField
          label="邮箱"
          helperText="建议填写真实邮箱，方便识别成员。"
        >
          <input
            className={adminInputClassName}
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="editor@example.com"
          />
        </AdminFormField>

        <AdminFormField
          label="登录密码"
          helperText="创建成员或调整密码时填写，留空则保留旧密码。"
        >
          <input
            className={adminInputClassName}
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            placeholder="至少 8 位"
          />
        </AdminFormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminFormField label="角色" helperText="决定后台菜单和接口权限。">
          <select
            className={adminSelectClassName}
            value={form.role}
            onChange={(event) =>
              setForm((current) => ({ ...current, role: event.target.value }))
            }
          >
            {(metaQueryData?.roleOptions || Object.keys(ROLE_LABELS)).map(
              (role) => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ),
            )}
          </select>
        </AdminFormField>

        <AdminFormField
          label="状态"
          helperText="停用后会在下一次验权时失去后台访问能力。"
        >
          <select
            className={adminSelectClassName}
            value={form.status}
            onChange={(event) =>
              setForm((current) => ({ ...current, status: event.target.value }))
            }
          >
            {(metaQueryData?.statusOptions || Object.keys(STATUS_LABELS)).map(
              (status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status] || status}
                </option>
              ),
            )}
          </select>
        </AdminFormField>

        <AdminFormField
          label="密钥槽位"
          helperText="需要和环境变量对应时再绑定。"
        >
          <select
            className={adminSelectClassName}
            value={form.keySlot}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                keySlot: event.target.value,
              }))
            }
          >
            <option value="">暂不绑定</option>
            {keySlotOptions.map((slot) => (
              <option key={slot.slot} value={slot.slot}>
                {`槽位 ${slot.slot} · 默认角色 ${formatRole(slot.configuredRole)}`}
                {slot.assignedMemberId &&
                slot.assignedMemberId !== editingMember?.id
                  ? "（已占用）"
                  : slot.missing
                    ? "（当前环境未配置）"
                    : ""}
              </option>
            ))}
          </select>
        </AdminFormField>
      </div>

      <AdminFormField
        label="备注"
        helperText="记下这位成员负责的内容范围或值班说明。"
      >
        <textarea
          className={adminTextareaClassName}
          rows={4}
          value={form.notes}
          onChange={(event) =>
            setForm((current) => ({ ...current, notes: event.target.value }))
          }
          placeholder="例如：负责首页编排、作品上架和创作者署名维护。"
        />
      </AdminFormField>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          取消
        </Button>
        <Button type="button" onClick={onSave} disabled={isPending}>
          {isPending ? "保存中..." : editingMember ? "保存更改" : "创建成员"}
        </Button>
      </div>
    </div>
  );
}

export function TotpSecretModalContent({ totpSheet, onCopy, onClose }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]">
        <p className="text-sm font-semibold text-slate-950">
          {totpSheet?.member?.name || "后台成员"}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          新密钥只会展示一次，关闭后不会再明文返回。
        </p>
      </div>

      <AdminFormField
        label="手动录入密钥"
        helperText="需要手动添加到验证器时，直接复制这一串。"
      >
        <div className="flex gap-2">
          <input
            className={adminInputClassName}
            readOnly
            value={totpSheet?.secret || ""}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onCopy(totpSheet?.secret || "", "密钥")}
          >
            <Copy className="size-4" />
            复制
          </Button>
        </div>
      </AdminFormField>

      <AdminFormField
        label="验证器导入链接"
        helperText="支持导入链接的验证器可以直接使用。"
      >
        <div className="flex gap-2">
          <input
            className={adminInputClassName}
            readOnly
            value={totpSheet?.otpauthUrl || ""}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onCopy(totpSheet?.otpauthUrl || "", "导入链接")}
          >
            <Copy className="size-4" />
            复制
          </Button>
        </div>
      </AdminFormField>

      <div className="flex justify-end">
        <Button type="button" onClick={onClose}>
          完成
        </Button>
      </div>
    </div>
  );
}
