"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import AdminShell from "@/components/admin/AdminShell";
import { AdminFeedbackBanner } from "@/components/admin/common/AdminFeedbackBanner";
import { ConfirmDialog } from "@/components/admin/common/ConfirmDialog";
import { Modal } from "@/components/admin/common/Modal";
import { AdminPageSection } from "@/components/admin/common/AdminWorkspacePrimitives";
import {
  CreateCampaignModalContent,
  MarketingCampaignsSection,
  MarketingControlsSection,
  MarketingSegmentsSection,
  MarketingStatsSection,
  MarketingSummaryCards,
  MarketingTypesSection,
} from "@/components/admin/marketing-workspace/sections";
import {
  buildCampaignPayload,
  buildDateQuery,
  EMPTY_FEEDBACK,
  getErrorMessage,
  INITIAL_FORM,
  MARKETING_TABS,
  requestPayload,
  SEGMENT_OPTIONS,
  STATUS_OPTIONS,
  tabMeta,
  TYPE_OPTIONS,
} from "@/components/admin/marketing-workspace/utils";

export default function AdminMarketingPage() {
  const [viewMode, setViewMode] = useState("campaigns");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const dateQuery = buildDateQuery(dateRange);

  const campaignsQuery = useQuery({
    queryKey: ["admin", "marketing", "campaigns"],
    staleTime: 60_000,
    queryFn: async () => {
      const data = await requestPayload("/api/admin/marketing/campaigns", {
        cache: "no-store",
      });
      return Array.isArray(data?.campaigns) ? data.campaigns : [];
    },
  });

  const statsQuery = useQuery({
    queryKey: ["admin", "marketing", "stats", dateQuery],
    staleTime: 60_000,
    queryFn: async () => {
      const data = await requestPayload(
        `/api/admin/marketing/stats${dateQuery}`,
        {
          cache: "no-store",
        },
      );
      return data?.stats || null;
    },
  });

  const segmentsQuery = useQuery({
    queryKey: ["admin", "marketing", "segments", dateQuery],
    staleTime: 60_000,
    queryFn: async () => {
      const data = await requestPayload(
        `/api/admin/marketing/stats/by-segment${dateQuery}`,
        {
          cache: "no-store",
        },
      );
      return Array.isArray(data?.segments) ? data.segments : [];
    },
  });

  const typesQuery = useQuery({
    queryKey: ["admin", "marketing", "types", dateQuery],
    staleTime: 60_000,
    queryFn: async () => {
      const data = await requestPayload(
        `/api/admin/marketing/stats/by-type${dateQuery}`,
        {
          cache: "no-store",
        },
      );
      return Array.isArray(data?.types) ? data.types : [];
    },
  });

  const refreshAll = () =>
    Promise.all([
      campaignsQuery.refetch(),
      statsQuery.refetch(),
      segmentsQuery.refetch(),
      typesQuery.refetch(),
    ]);

  const createCampaignMutation = useMutation({
    mutationFn: async (draft) =>
      requestPayload("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCampaignPayload(draft)),
      }),
    onSuccess: async () => {
      setViewMode("campaigns");
      setIsCreateModalOpen(false);
      setFormData(INITIAL_FORM);
      setFeedback({ type: "success", message: "活动已创建。" });
      await refreshAll();
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getErrorMessage(error, "创建活动失败。"),
      });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId) =>
      requestPayload(`/api/admin/marketing/campaigns/${campaignId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      setIsDeleteModalOpen(false);
      setSelectedCampaign(null);
      setFeedback({ type: "success", message: "活动已删除。" });
      await refreshAll();
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getErrorMessage(error, "删除活动失败。"),
      });
    },
  });

  const campaigns = Array.isArray(campaignsQuery.data)
    ? campaignsQuery.data
    : [];
  const stats = statsQuery.data;
  const segments = Array.isArray(segmentsQuery.data) ? segmentsQuery.data : [];
  const types = Array.isArray(typesQuery.data) ? typesQuery.data : [];

  const metricSnapshot = useMemo(() => {
    const activeCampaigns = campaigns.filter(
      (campaign) => String(campaign?.status || "").toLowerCase() === "active",
    ).length;

    return {
      totalCampaigns: stats?.totalCampaigns ?? campaigns.length,
      activeCampaigns: stats?.activeCampaigns ?? activeCampaigns,
      totalBudget: stats?.totalBudget ?? 0,
      avgRoi: stats?.avgRoi ?? 0,
    };
  }, [campaigns, stats]);

  const setFormValue = (key, value) =>
    setFormData((current) => ({ ...current, [key]: value }));
  const setRangeValue = (key, value) =>
    setDateRange((current) => ({ ...current, [key]: value }));

  const openCreateModal = () => {
    setFeedback(EMPTY_FEEDBACK);
    setFormData(INITIAL_FORM);
    setIsCreateModalOpen(true);
  };

  const handleCreateCampaign = () => {
    const budgetValue = formData.budget === "" ? null : Number(formData.budget);

    if (!formData.name.trim()) {
      setFeedback({ type: "error", message: "请填写活动名称。" });
      return;
    }

    if (
      budgetValue !== null &&
      (!Number.isFinite(budgetValue) || budgetValue < 0)
    ) {
      setFeedback({ type: "error", message: "预算必须是有效的非负数字。" });
      return;
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate > formData.endDate
    ) {
      setFeedback({ type: "error", message: "结束日期不能早于开始日期。" });
      return;
    }

    createCampaignMutation.mutate(formData);
  };

  const handleDeleteCampaign = () => {
    if (!selectedCampaign?.id) {
      setFeedback({ type: "error", message: "无法识别当前选中的活动。" });
      setIsDeleteModalOpen(false);
      return;
    }

    deleteCampaignMutation.mutate(selectedCampaign.id);
  };

  const tabContentMeta = tabMeta(viewMode);

  return (
    <AdminShell title="营销活动" subtitle="管理活动并查看结果。">
      <div className="space-y-6">
        <MarketingSummaryCards metricSnapshot={metricSnapshot} />

        <AdminFeedbackBanner
          feedback={feedback}
          onDismiss={() => setFeedback(EMPTY_FEEDBACK)}
        />

        <MarketingControlsSection
          tabs={MARKETING_TABS}
          viewMode={viewMode}
          tabContentMeta={tabContentMeta}
          dateRange={dateRange}
          onViewModeChange={setViewMode}
          onRangeValueChange={setRangeValue}
          onRefresh={() => refreshAll()}
          onOpenCreate={openCreateModal}
        />

        <AdminPageSection
          title={tabContentMeta.title}
          description={tabContentMeta.description}
        >
          {viewMode === "campaigns" ? (
            <MarketingCampaignsSection
              campaignsQuery={campaignsQuery}
              campaigns={campaigns}
              onOpenDelete={(campaign) => {
                setSelectedCampaign(campaign);
                setIsDeleteModalOpen(true);
              }}
              deletePending={deleteCampaignMutation.isPending}
              selectedCampaignId={selectedCampaign?.id}
            />
          ) : null}

          {viewMode === "stats" ? (
            <MarketingStatsSection statsQuery={statsQuery} stats={stats} />
          ) : null}

          {viewMode === "by-segment" ? (
            <MarketingSegmentsSection
              segmentsQuery={segmentsQuery}
              segments={segments}
            />
          ) : null}

          {viewMode === "by-type" ? (
            <MarketingTypesSection typesQuery={typesQuery} types={types} />
          ) : null}
        </AdminPageSection>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        title="新建活动"
        subtitle="写清名称、对象和时间。"
        onClose={() => setIsCreateModalOpen(false)}
        size="xl"
      >
        <CreateCampaignModalContent
          formData={formData}
          setFormValue={setFormValue}
          segmentOptions={SEGMENT_OPTIONS}
          typeOptions={TYPE_OPTIONS}
          statusOptions={STATUS_OPTIONS}
          onCancel={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateCampaign}
          isPending={createCampaignMutation.isPending}
        />
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title="删除活动"
        message={`确定删除“${selectedCampaign?.name || "当前活动"}”吗？删除后无法恢复。`}
        confirmText={
          deleteCampaignMutation.isPending ? "正在删除..." : "删除活动"
        }
        cancelText="取消"
        isDangerous={true}
        isLoading={deleteCampaignMutation.isPending}
        onConfirm={handleDeleteCampaign}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedCampaign(null);
        }}
      />
    </AdminShell>
  );
}
