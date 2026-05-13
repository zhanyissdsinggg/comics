"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import AdminShell from "@/components/admin/AdminShell";
import { AdminFeedbackBanner } from "@/components/admin/common/AdminFeedbackBanner";
import { Modal } from "@/components/admin/common/Modal";
import {
  MemberEditorModalContent,
  MembersDirectorySection,
  MembersGuideSection,
  MembersSortDialog,
  MembersSummaryCards,
  TotpSecretModalContent,
} from "@/components/admin/members-workspace/sections";
import {
  buildPayload,
  DEFAULT_FORM,
  SEARCH_FIELDS,
  SORT_FIELDS,
  SORT_OPTIONS,
  toFormState,
} from "@/components/admin/members-workspace/utils";
import { adminFetch, readAdminResponseMessage } from "@/lib/adminApiClient";
import { useAdminList } from "@/lib/hooks/useAdminList";

export default function AdminMembersPage() {
  const [feedback, setFeedback] = useState({ type: "", message: "" });
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
  } = useAdminList("members", SEARCH_FIELDS, SORT_FIELDS, "createdAt", "desc");

  const metaQuery = useQuery({
    queryKey: ["admin", "members", "meta"],
    queryFn: async () => {
      const response = await adminFetch("/api/admin/members/meta");
      if (!response.ok) {
        throw new Error(
          await readAdminResponseMessage(response, "成员配置加载失败。"),
        );
      }
      return response.json();
    },
  });

  const enabledCount = useMemo(
    () => members.filter((member) => member.status === "active").length,
    [members],
  );
  const boundSlotsCount = useMemo(
    () =>
      members.filter((member) => member.keySlotStatus === "assigned").length,
    [members],
  );
  const totpEnabledCount = useMemo(
    () => members.filter((member) => member.totpEnabled).length,
    [members],
  );

  const keySlotOptions = useMemo(() => {
    const base = Array.isArray(metaQuery.data?.keySlots)
      ? [...metaQuery.data.keySlots]
      : [];

    if (
      editingMember?.keySlot &&
      !base.some((slot) => Number(slot.slot) === Number(editingMember.keySlot))
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
        editingMember
          ? `/api/admin/members/${editingMember.id}`
          : "/api/admin/members",
        {
          method: editingMember ? "PATCH" : "POST",
          body: JSON.stringify({ member: payload }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readAdminResponseMessage(response, "成员保存失败。"),
        );
      }

      return response.json();
    },
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: editingMember ? "后台成员已更新。" : "后台成员已创建。",
      });
      setIsEditorOpen(false);
      setEditingMember(null);
      setForm(DEFAULT_FORM);
      refetch();
      metaQuery.refetch();
    },
    onError: (mutationError) => {
      setFeedback({
        type: "error",
        message: `成员保存失败：${mutationError.message}`,
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await adminFetch("/api/admin/members/sync-env", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          await readAdminResponseMessage(response, "密钥槽位同步失败。"),
        );
      }

      return response.json();
    },
    onSuccess: (data) => {
      setFeedback({
        type: "success",
        message: `已同步环境密钥槽位，本次新增 ${Number(data?.created || 0)} 个槽位成员。`,
      });
      refetch();
      metaQuery.refetch();
    },
    onError: (mutationError) => {
      setFeedback({
        type: "error",
        message: `同步失败：${mutationError.message}`,
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await adminFetch(`/api/admin/members/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(
          await readAdminResponseMessage(response, "成员状态更新失败。"),
        );
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      setFeedback({
        type: "success",
        message:
          variables.status === "disabled" ? "成员已停用。" : "成员已重新启用。",
      });
      refetch();
      metaQuery.refetch();
    },
    onError: (mutationError) => {
      setFeedback({
        type: "error",
        message: `状态更新失败：${mutationError.message}`,
      });
    },
  });

  const resetTotpMutation = useMutation({
    mutationFn: async (id) => {
      const response = await adminFetch(`/api/admin/members/${id}/reset-2fa`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          await readAdminResponseMessage(response, "两步验证重置失败。"),
        );
      }

      return response.json();
    },
    onSuccess: (data) => {
      setTotpSheet(data);
      setFeedback({
        type: "success",
        message: "新的两步验证密钥已生成，请马上保存到验证器。",
      });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({
        type: "error",
        message: `两步验证重置失败：${mutationError.message}`,
      });
    },
  });

  const clearTotpMutation = useMutation({
    mutationFn: async (id) => {
      const response = await adminFetch(`/api/admin/members/${id}/2fa`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(
          await readAdminResponseMessage(response, "两步验证清除失败。"),
        );
      }

      return response.json();
    },
    onSuccess: () => {
      setFeedback({ type: "success", message: "成员专属两步验证已清除。" });
      refetch();
    },
    onError: (mutationError) => {
      setFeedback({
        type: "error",
        message: `两步验证清除失败：${mutationError.message}`,
      });
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
      await navigator.clipboard.writeText(String(value || ""));
      setFeedback({ type: "success", message: `${label} 已复制。` });
    } catch {
      setFeedback({
        type: "error",
        message: `${label} 复制失败，请手动复制。`,
      });
    }
  };

  return (
    <AdminShell title="后台成员" subtitle="维护成员、角色、槽位和两步验证。">
      <div className="space-y-6">
        <MembersSummaryCards
          paginationTotal={pagination.total}
          enabledCount={enabledCount}
          boundSlotsCount={boundSlotsCount}
          totpEnabledCount={totpEnabledCount}
        />

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback({ type: "", message: "" })}
        />

        <MembersDirectorySection
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          sortOrder={sortOrder}
          onToggleSortOrder={() =>
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
          }
          onOpenSort={() => setIsSortModalOpen(true)}
          onSync={() => syncMutation.mutate()}
          syncPending={syncMutation.isPending}
          onOpenCreate={openCreateModal}
          membersState={{
            isError: isError || metaQuery.isError,
            errorMessage:
              error?.message ||
              metaQuery.error?.message ||
              "成员目录加载失败。",
            isLoading: isLoading || metaQuery.isLoading,
          }}
          members={members}
          pagination={pagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onRetry={() => {
            refetch();
            metaQuery.refetch();
          }}
          onOpenEdit={openEditModal}
          onToggleStatus={(payload) => statusMutation.mutate(payload)}
          statusPending={statusMutation.isPending}
          onResetTotp={(id) => resetTotpMutation.mutate(id)}
          resetTotpPending={resetTotpMutation.isPending}
          onClearTotp={(id) => clearTotpMutation.mutate(id)}
          clearTotpPending={clearTotpMutation.isPending}
        />

        <MembersGuideSection />
      </div>

      <MembersSortDialog
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        options={SORT_OPTIONS}
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
        title={editingMember ? "编辑后台成员" : "新建后台成员"}
        subtitle="在这里维护成员身份、角色和两步验证。"
        size="lg"
      >
        <MemberEditorModalContent
          editingMember={editingMember}
          form={form}
          setForm={setForm}
          metaQueryData={metaQuery.data}
          keySlotOptions={keySlotOptions}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingMember(null);
            setForm(DEFAULT_FORM);
          }}
          onSave={() => saveMutation.mutate()}
          isPending={saveMutation.isPending}
        />
      </Modal>

      <Modal
        isOpen={Boolean(totpSheet)}
        onClose={() => setTotpSheet(null)}
        title="新的两步验证密钥"
        subtitle="请立即把下面的密钥或导入链接加入验证器。"
        size="lg"
      >
        <TotpSecretModalContent
          totpSheet={totpSheet}
          onCopy={copyToClipboard}
          onClose={() => setTotpSheet(null)}
        />
      </Modal>
    </AdminShell>
  );
}
