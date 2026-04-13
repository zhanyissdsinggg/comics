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

export function MembersSummaryCards({ paginationTotal, enabledCount, boundSlotsCount, totpEnabledCount }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <AdminMetricCard
        label="当前成员数"
        value={String(paginationTotal)}
        detail="包含手动成员和同步出的槽位成员。"
        tone="accent"
      />
      <AdminMetricCard
        label="已启用成员"
        value={String(enabledCount)}
        detail="启用状态的成员可以继续进入后台。"
      />
      <AdminMetricCard
        label="已启用两步验证"
        value={String(totpEnabledCount)}
        detail={`当前有 ${boundSlotsCount} 个成员已绑定密钥槽位。`}
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
      description="快速查看成员、角色、密钥槽位和两步验证。"
    >
      <AdminListToolbar
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        searchPlaceholder="搜索成员名称、邮箱、角色或成员编号..."
        onOpenFilters={onOpenSort}
        sortOrder={sortOrder}
        onToggleSortOrder={onToggleSortOrder}
        filtersLabel="排序"
        ascendingLabel="更早优先"
        descendingLabel="最新优先"
        extraActions={
          <>
            <Button type="button" variant="outline" onClick={onSync} disabled={syncPending}>
              <RefreshCcw className="size-4" />
              {syncPending ? "同步中..." : "同步密钥槽位"}
            </Button>
            <Button type="button" onClick={onOpenCreate}>
              <Plus className="size-4" />
              新建成员
            </Button>
          </>
        }
      />

      <AdminTableShell
        isError={membersState.isError}
        errorMessage={membersState.errorMessage}
        onRetry={onRetry}
        isLoading={membersState.isLoading}
        hasItems={members.length > 0}
        emptyMessage="当前还没有后台成员。先同步环境密钥槽位，或手动新增成员。"
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
                <th className="px-4 py-4">密钥槽位</th>
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
                      <p className="font-semibold text-slate-950">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email || "未填写邮箱"}</p>
                      <p className="text-xs text-slate-500">
                        {getSourceLabel(member.source)} · {member.id}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <AdminBadge tone="accent">{formatRole(member.role)}</AdminBadge>
                  </td>
                  <td className="px-4 py-4">
                    <AdminBadge tone={member.status === "active" ? "success" : "default"}>
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
                            ? "与环境密钥槽位保持一致"
                            : member.keySlotStatus === "missing"
                              ? "当前环境没有这个槽位"
                              : "暂未绑定"}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <AdminBadge tone={member.totpEnabled ? "success" : "default"}>
                        {member.totpEnabled ? "已启用" : "未启用"}
                      </AdminBadge>
                      <p className="text-xs text-slate-500">
                        {member.hasTotpSecret ? "已生成密钥" : "未生成密钥"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(member.lastLoginAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2 rounded-[20px] border border-[color:var(--gush-border)] bg-white p-2 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]">
                      <Button type="button" variant="outline" size="sm" onClick={() => onOpenEdit(member)}>
                        编辑
                      </Button>
                      <Button
                        type="button"
                        variant={member.status === "active" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() =>
                          onToggleStatus({
                            id: member.id,
                            status: member.status === "active" ? "disabled" : "active",
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
  return (
    <AdminPageSection
      title="使用建议"
      description="在这里维护后台成员、角色和两步验证。"
      accent="amber"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]">
          <p className="text-sm font-semibold text-slate-950">先同步密钥槽位</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            先同步槽位，再补齐姓名、邮箱和角色。
          </p>
        </div>
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]">
          <p className="text-sm font-semibold text-slate-950">角色和状态在这里维护</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            菜单权限继续跟角色走，成员身份在这里维护。
          </p>
        </div>
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]">
          <p className="text-sm font-semibold text-slate-950">验证密钥只在重置后展示一次</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            重置后请立刻保存，明文密钥不会长期保留。
          </p>
        </div>
      </div>
    </AdminPageSection>
  );
}

export function MembersSortDialog({ isOpen, onClose, sortBy, onSortByChange, options }) {
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
        <AdminFormField label="成员名称" helperText="用于后台显示、日志和会话卡片。">
          <input
            className={adminInputClassName}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="例如：内容主编"
          />
        </AdminFormField>

        <AdminFormField label="邮箱" helperText="建议填写真实邮箱，方便识别成员身份。">
          <input
            className={adminInputClassName}
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="editor@yoursite.com"
          />
        </AdminFormField>

        <AdminFormField label="登录密码" helperText="成员创建或调整密码时请更新。空白不会覆盖旧密码。">
          <input
            className={adminInputClassName}
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="至少 8 位的密码"
          />
        </AdminFormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminFormField label="角色" helperText="决定后台菜单和接口权限范围。">
          <select
            className={adminSelectClassName}
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
          >
            {(metaQueryData?.roleOptions || Object.keys(ROLE_LABELS)).map((role) => (
              <option key={role} value={role}>
                {formatRole(role)}
              </option>
            ))}
          </select>
        </AdminFormField>

        <AdminFormField label="状态" helperText="停用后成员会在下一次验权时失去后台访问能力。">
          <select
            className={adminSelectClassName}
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
          >
            {(metaQueryData?.statusOptions || Object.keys(STATUS_LABELS)).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status] || status}
              </option>
            ))}
          </select>
        </AdminFormField>

        <AdminFormField label="密钥槽位" helperText="绑定后，该成员会与对应的 ADMIN_KEYS 槽位关联。">
          <select
            className={adminSelectClassName}
            value={form.keySlot}
            onChange={(event) => setForm((current) => ({ ...current, keySlot: event.target.value }))}
          >
            <option value="">暂不绑定</option>
            {keySlotOptions.map((slot) => (
              <option key={slot.slot} value={slot.slot}>
                {`槽位 ${slot.slot} · 默认角色 ${formatRole(slot.configuredRole)}`}
                {slot.assignedMemberId && slot.assignedMemberId !== editingMember?.id
                  ? "（已占用）"
                  : slot.missing
                    ? "（当前环境未配置）"
                    : ""}
              </option>
            ))}
          </select>
        </AdminFormField>
      </div>

      <AdminFormField label="备注" helperText="记录这个成员负责的领域或轮班说明。">
        <textarea
          className={adminTextareaClassName}
          rows={4}
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="例如：负责首页编排、作品上架与创作者署名维护。"
        />
      </AdminFormField>

      <div className="flex flex-wrap justify-end gap-2 rounded-[22px] border border-[color:var(--gush-border)] bg-white p-2 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
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
        <p className="text-sm font-semibold text-slate-950">{totpSheet?.member?.name || "后台成员"}</p>
        <p className="mt-1 text-sm text-slate-600">
          新密钥只会在这里展示一次，关闭后不会再以明文形式返回。
        </p>
      </div>

      <AdminFormField label="手动录入密钥" helperText="需要手动添加验证器时，直接粘贴这一串即可。">
        <div className="flex gap-2">
          <input className={adminInputClassName} readOnly value={totpSheet?.secret || ""} />
          <Button type="button" variant="outline" onClick={() => onCopy(totpSheet?.secret || "", "密钥")}>
            <Copy className="size-4" />
            复制
          </Button>
        </div>
      </AdminFormField>

      <AdminFormField label="验证器导入链接" helperText="支持从链接导入的验证器应用可以直接使用。">
        <div className="flex gap-2">
          <input className={adminInputClassName} readOnly value={totpSheet?.otpauthUrl || ""} />
          <Button
            type="button"
            variant="outline"
            onClick={() => onCopy(totpSheet?.otpauthUrl || "", "验证器导入链接")}
          >
            <Copy className="size-4" />
            复制
          </Button>
        </div>
      </AdminFormField>

      <div className="flex justify-end rounded-[22px] border border-[color:var(--gush-border)] bg-white p-2 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]">
        <Button type="button" onClick={onClose}>
          完成
        </Button>
      </div>
    </div>
  );
}
