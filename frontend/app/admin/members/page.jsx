'use client';

export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Copy,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCcw,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';

import AdminShell from '@/components/admin/AdminShell';
import { AdminFeedbackBanner } from '@/components/admin/common/AdminFeedbackBanner';
import { AdminListToolbar } from '@/components/admin/common/AdminListToolbar';
import { AdminSortModal } from '@/components/admin/common/AdminSortModal';
import { AdminTableShell } from '@/components/admin/common/AdminTableShell';
import { Modal } from '@/components/admin/common/Modal';
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
} from '@/components/admin/common/AdminWorkspacePrimitives';
import { Button } from '@/components/ui/button';
import { adminFetch, readAdminResponseMessage } from '@/lib/adminApiClient';
import { useAdminList } from '@/lib/hooks/useAdminList';

const DEFAULT_FORM = {
  name: '',
  email: '',
  role: 'content_admin',
  status: 'active',
  keySlot: '',
  notes: '',
};

const searchFields = [
  { field: 'id', type: 'string' },
  { field: 'name', type: 'string' },
  { field: 'email', type: 'string' },
  { field: 'role', type: 'string' },
];

const sortFields = [
  { field: 'createdAt', type: 'date' },
  { field: 'lastLoginAt', type: 'date' },
  { field: 'name', type: 'string' },
];

const sortOptions = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'lastLoginAt', label: '最近登录' },
  { value: 'name', label: '成员名称' },
];

const ROLE_LABELS = {
  super_admin: '超级管理员',
  content_admin: '内容运营',
  user_admin: '用户管理',
  finance_admin: '财务管理',
  support_admin: '客服支持',
  marketing_admin: '营销运营',
  ops_admin: '系统运维',
};

const STATUS_LABELS = {
  active: '启用',
  disabled: '停用',
};

function formatDate(value) {
  if (!value) {
    return '暂无';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRole(role) {
  return ROLE_LABELS[String(role || '').trim().toLowerCase()] || '超级管理员';
}

function buildPayload(form) {
  return {
    name: String(form.name || '').trim(),
    email: String(form.email || '').trim() || null,
    role: String(form.role || '').trim() || 'content_admin',
    status: String(form.status || '').trim() || 'active',
    keySlot: form.keySlot === '' ? null : Number(form.keySlot),
    notes: String(form.notes || '').trim() || null,
  };
}

function toFormState(member) {
  if (!member) {
    return { ...DEFAULT_FORM };
  }

  return {
    name: member.name || '',
    email: member.email || '',
    role: member.role || 'content_admin',
    status: member.status || 'active',
    keySlot: typeof member.keySlot === 'number' ? String(member.keySlot) : '',
    notes: member.notes || '',
  };
}

function getSourceLabel(source) {
  return source === 'env_seed' ? '环境密钥槽位' : '手动成员';
}

function getKeySlotTone(status) {
  if (status === 'missing') {
    return 'danger';
  }
  if (status === 'assigned') {
    return 'accent';
  }
  return 'default';
}

function getKeySlotLabel(member) {
  if (member.keySlotStatus === 'missing') {
    return `槽位 ${member.keySlot}（环境未配置）`;
  }
  if (member.keySlotStatus === 'assigned') {
    return `槽位 ${member.keySlot}`;
  }
  return '未绑定';
}

export default function AdminMembersPage() {
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [totpSheet, setTotpSheet] = useState(null);

  const {
    items: members,
    pagination,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    isError,
    error,
    refetch,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  } = useAdminList('members', searchFields, sortFields, 'createdAt', 'desc');

  const metaQuery = useQuery({
    queryKey: ['admin', 'members', 'meta'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/members/meta');
      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '成员配置加载失败。'));
      }
      return response.json();
    },
  });

  const enabledCount = useMemo(
    () => members.filter((member) => member.status === 'active').length,
    [members],
  );
  const boundSlotsCount = useMemo(
    () => members.filter((member) => member.keySlotStatus === 'assigned').length,
    [members],
  );
  const totpEnabledCount = useMemo(
    () => members.filter((member) => member.totpEnabled).length,
    [members],
  );

  const keySlotOptions = useMemo(() => {
    const base = Array.isArray(metaQuery.data?.keySlots) ? [...metaQuery.data.keySlots] : [];

    if (
      editingMember?.keySlot
      && !base.some((slot) => Number(slot.slot) === Number(editingMember.keySlot))
    ) {
      base.push({
        slot: editingMember.keySlot,
        configuredRole: editingMember.role,
        assignedMemberId: editingMember.id,
        assignedMemberName: editingMember.name,
        missing: true,
      });
    }

    return base.sort((left, right) => Number(left.slot) - Number(right.slot));
  }, [editingMember, metaQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form);
      const response = await adminFetch(
        editingMember ? `/api/admin/members/${editingMember.id}` : '/api/admin/members',
        {
          method: editingMember ? 'PATCH' : 'POST',
          body: JSON.stringify({ member: payload }),
        },
      );

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '成员保存失败。'));
      }

      return response.json();
    },
    onSuccess: () => {
      setFeedback({
        type: 'success',
        message: editingMember ? '后台成员已更新。' : '后台成员已创建。',
      });
      setIsEditorOpen(false);
      setEditingMember(null);
      setForm(DEFAULT_FORM);
      refetch();
      metaQuery.refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `成员保存失败：${mutationError.message}` });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await adminFetch('/api/admin/members/sync-env', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '密钥槽位同步失败。'));
      }

      return response.json();
    },
    onSuccess: (data) => {
      setFeedback({
        type: 'success',
        message: `已同步环境密钥槽位，本次新增 ${Number(data?.created || 0)} 个成员占位。`,
      });
      refetch();
      metaQuery.refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `同步失败：${mutationError.message}` });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await adminFetch(`/api/admin/members/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '成员状态更新失败。'));
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      setFeedback({
        type: 'success',
        message: variables.status === 'disabled' ? '成员已停用。' : '成员已重新启用。',
      });
      refetch();
      metaQuery.refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `状态更新失败：${mutationError.message}` });
    },
  });

  const resetTotpMutation = useMutation({
    mutationFn: async (id) => {
      const response = await adminFetch(`/api/admin/members/${id}/reset-2fa`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '2FA 重置失败。'));
      }

      return response.json();
    },
    onSuccess: (data) => {
      setTotpSheet(data);
      setFeedback({
        type: 'success',
        message: '新的 2FA 密钥已生成，请马上保存到验证器。',
      });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `2FA 重置失败：${mutationError.message}` });
    },
  });

  const clearTotpMutation = useMutation({
    mutationFn: async (id) => {
      const response = await adminFetch(`/api/admin/members/${id}/2fa`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readAdminResponseMessage(response, '2FA 清除失败。'));
      }

      return response.json();
    },
    onSuccess: () => {
      setFeedback({ type: 'success', message: '成员专属 2FA 已清除。' });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({ type: 'error', message: `2FA 清除失败：${mutationError.message}` });
    },
  });

  const openCreateModal = () => {
    setEditingMember(null);
    setForm(DEFAULT_FORM);
    setIsEditorOpen(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setForm(toFormState(member));
    setIsEditorOpen(true);
  };

  const copyToClipboard = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      setFeedback({ type: 'success', message: `${label} 已复制。` });
    } catch {
      setFeedback({ type: 'error', message: `${label} 复制失败，请手动复制。` });
    }
  };

  return (
    <AdminShell
      title="后台成员"
      subtitle="把管理员身份、角色范围、密钥槽位和二次验证放进一套真实可维护的成员目录里，不再只靠环境变量硬扛。"
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminMetricCard
            label="当前成员数"
            value={String(pagination.total)}
            detail="包含手动成员和由环境密钥槽位同步出的后台成员。"
            tone="accent"
          />
          <AdminMetricCard
            label="已启用成员"
            value={String(enabledCount)}
            detail="状态为启用的成员可以继续进入后台。"
          />
          <AdminMetricCard
            label="已配置二次验证"
            value={String(totpEnabledCount)}
            detail={`当前结果中有 ${boundSlotsCount} 个成员已经绑定有效密钥槽位。`}
          />
        </div>

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: '', message: '' })}
        />

        <AdminPageSection
          title="成员目录"
          description="这里回答四件事：谁在用后台、他能看到什么、绑定了哪一个密钥槽位、有没有二次验证。"
        >
          <AdminListToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchPlaceholder="搜索成员名称、邮箱、角色或成员 ID..."
            onOpenFilters={() => setIsSortModalOpen(true)}
            sortOrder={sortOrder}
            onToggleSortOrder={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            filtersLabel="排序"
            ascendingLabel="更早优先"
            descendingLabel="最新优先"
            extraActions={(
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  <RefreshCcw className="size-4" />
                  {syncMutation.isPending ? '同步中...' : '同步密钥槽位'}
                </Button>
                <Button type="button" onClick={openCreateModal}>
                  <Plus className="size-4" />
                  新建成员
                </Button>
              </>
            )}
          />

          <AdminTableShell
            isError={isError || metaQuery.isError}
            errorMessage={error?.message || metaQuery.error?.message || '成员目录加载失败。'}
            onRetry={() => {
              refetch();
              metaQuery.refetch();
            }}
            isLoading={isLoading || metaQuery.isLoading}
            hasItems={members.length > 0}
            emptyMessage="当前还没有后台成员。先同步环境密钥槽位，或手动新增成员。"
            pagination={pagination}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          >
            <AdminDataTable className="border-0 shadow-none">
              <table className="w-full min-w-[980px]">
                <AdminTableHeader>
                  <tr>
                    <th className="px-4 py-4">成员</th>
                    <th className="px-4 py-4">角色</th>
                    <th className="px-4 py-4">状态</th>
                    <th className="px-4 py-4">密钥槽位</th>
                    <th className="px-4 py-4">2FA</th>
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
                          <p className="text-xs text-slate-500">
                            {member.email || '未填写邮箱'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {getSourceLabel(member.source)} · {member.id}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone="accent">{formatRole(member.role)}</AdminBadge>
                      </td>
                      <td className="px-4 py-4">
                        <AdminBadge tone={member.status === 'active' ? 'success' : 'default'}>
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
                              {member.keySlotStatus === 'assigned'
                                ? '与环境密钥槽位保持一致'
                                : member.keySlotStatus === 'missing'
                                  ? '当前环境没有这个槽位'
                                  : '暂未绑定'}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <AdminBadge tone={member.totpEnabled ? 'success' : 'default'}>
                            {member.totpEnabled ? '已启用' : '未启用'}
                          </AdminBadge>
                          <p className="text-xs text-slate-500">
                            {member.hasTotpSecret ? '已生成密钥' : '未生成密钥'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(member.lastLoginAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(member)}>
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant={member.status === 'active' ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() =>
                              statusMutation.mutate({
                                id: member.id,
                                status: member.status === 'active' ? 'disabled' : 'active',
                              })
                            }
                            disabled={statusMutation.isPending}
                          >
                            {member.status === 'active' ? (
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
                            onClick={() => resetTotpMutation.mutate(member.id)}
                            disabled={resetTotpMutation.isPending}
                          >
                            <ShieldCheck className="size-4" />
                            重置 2FA
                          </Button>
                          {member.hasTotpSecret ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => clearTotpMutation.mutate(member.id)}
                              disabled={clearTotpMutation.isPending}
                            >
                              <ShieldOff className="size-4" />
                              清除 2FA
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

        <AdminPageSection
          title="怎么用这页"
          description="后台成员体系现在仍以环境密钥登录，但成员档案、角色、状态和 2FA 已经落到数据库里，日常运营终于有一套真实可维护的入口。"
          accent="amber"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4">
              <p className="text-sm font-semibold text-slate-950">先同步密钥槽位</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                把环境里的 ADMIN_KEYS 槽位同步进成员目录，再补齐姓名、邮箱和真实角色。
              </p>
            </div>
            <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4">
              <p className="text-sm font-semibold text-slate-950">角色和状态在这里维护</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                菜单可见范围和权限继续走统一 RBAC，但成员身份不再只有一串环境变量。
              </p>
            </div>
            <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4">
              <p className="text-sm font-semibold text-slate-950">2FA 密钥只在重置后展示一次</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                重置后请立刻把密钥或 otpauth 链接加入验证器，页面不会替你长期明文保留。
              </p>
            </div>
          </div>
        </AdminPageSection>
      </div>

      <AdminSortModal
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        options={sortOptions}
        title="排序后台成员"
        label="排序方式"
        actionLabel="完成"
      />

      <Modal
        isOpen={isEditorOpen}
        onClose={() => {
          if (saveMutation.isPending) {
            return;
          }
          setIsEditorOpen(false);
          setEditingMember(null);
          setForm(DEFAULT_FORM);
        }}
        title={editingMember ? '编辑后台成员' : '新建后台成员'}
        subtitle="成员档案负责承接真实身份、角色和 2FA 配置；环境密钥只保留为当前登录凭证。"
        size="lg"
      >
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
                placeholder="name@example.com"
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
                {(metaQuery.data?.roleOptions || Object.keys(ROLE_LABELS)).map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </AdminFormField>

            <AdminFormField label="状态" helperText="停用后成员会在下次验权时失去后台访问能力。">
              <select
                className={adminSelectClassName}
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                {(metaQuery.data?.statusOptions || Object.keys(STATUS_LABELS)).map((status) => (
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
                      ? '（已占用）'
                      : slot.missing
                        ? '（当前环境未配置）'
                        : ''}
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
              placeholder="例如：负责首页编排、作品上线与 creator credits 维护。"
            />
          </AdminFormField>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditorOpen(false);
                setEditingMember(null);
                setForm(DEFAULT_FORM);
              }}
              disabled={saveMutation.isPending}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? '保存中...' : editingMember ? '保存更改' : '创建成员'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(totpSheet)}
        onClose={() => setTotpSheet(null)}
        title="新的 2FA 密钥"
        subtitle="请把下面的密钥或 otpauth 链接立刻加入 Google Authenticator、1Password 或其他验证器。"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4">
            <p className="text-sm font-semibold text-slate-950">
              {totpSheet?.member?.name || '后台成员'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              新密钥只会在这里展示一次，关闭后不会再以明文形式返回。
            </p>
          </div>

          <AdminFormField label="Base32 密钥" helperText="手动添加验证器时直接粘贴这一串。">
            <div className="flex gap-2">
              <input className={adminInputClassName} readOnly value={totpSheet?.secret || ''} />
              <Button
                type="button"
                variant="outline"
                onClick={() => copyToClipboard(totpSheet?.secret || '', '密钥')}
              >
                <Copy className="size-4" />
                复制
              </Button>
            </div>
          </AdminFormField>

          <AdminFormField label="otpauth 链接" helperText="支持从链接导入的验证器可以直接使用。">
            <div className="flex gap-2">
              <input className={adminInputClassName} readOnly value={totpSheet?.otpauthUrl || ''} />
              <Button
                type="button"
                variant="outline"
                onClick={() => copyToClipboard(totpSheet?.otpauthUrl || '', 'otpauth 链接')}
              >
                <Copy className="size-4" />
                复制
              </Button>
            </div>
          </AdminFormField>

          <div className="flex justify-end">
            <Button type="button" onClick={() => setTotpSheet(null)}>
              完成
            </Button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
