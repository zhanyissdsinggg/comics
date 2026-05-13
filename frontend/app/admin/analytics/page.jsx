"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import AdminShell from "@/components/admin/AdminShell";
import {
  AnalyticsSegmentsSection,
  AnalyticsStatsSection,
  AnalyticsUserDetailSection,
} from "@/components/admin/analytics-workspace/sections";
import {
  buildStatsCards,
  fetchAnalyticsAdminPayload,
  getErrorMessage,
  SEGMENT_FILTERS,
  VIEW_TABS,
} from "@/components/admin/analytics-workspace/utils";
import { AdminTabs } from "@/components/admin/common/AdminWorkspacePrimitives";

export default function AdminUserAnalyticsPage() {
  const [viewMode, setViewMode] = useState("stats");
  const [selectedSegment, setSelectedSegment] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const statsQuery = useQuery({
    queryKey: ["admin", "analytics", "stats"],
    staleTime: 60_000,
    queryFn: async () => {
      const data = await fetchAnalyticsAdminPayload(
        "/api/admin/analytics/stats",
      );
      return data?.stats || null;
    },
  });

  const segmentsQuery = useQuery({
    queryKey: [
      "admin",
      "analytics",
      "segments",
      selectedSegment,
      page,
      pageSize,
    ],
    staleTime: 60_000,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const params = new URLSearchParams({
        segment: selectedSegment,
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });

      const data = await fetchAnalyticsAdminPayload(
        `/api/admin/analytics/segments?${params}`,
      );
      return (
        data?.segments || {
          users: [],
          total: 0,
          limit: pageSize,
          offset: 0,
        }
      );
    },
  });

  const userDetailQuery = useQuery({
    queryKey: ["admin", "analytics", "user", selectedUserId],
    enabled: Boolean(selectedUserId),
    staleTime: 60_000,
    queryFn: async () => {
      const data = await fetchAnalyticsAdminPayload(
        `/api/admin/analytics/users/${selectedUserId}`,
      );
      return data?.analytics || null;
    },
  });

  const stats = statsQuery.data;
  const statsCards = useMemo(() => buildStatsCards(stats), [stats]);
  const segmentData = segmentsQuery.data || {
    users: [],
    total: 0,
    limit: pageSize,
    offset: 0,
  };
  const users = Array.isArray(segmentData?.users) ? segmentData.users : [];
  const totalUsers = Number(segmentData?.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize) || 1);
  const pagination = {
    page,
    pageSize,
    total: totalUsers,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  };
  const analytics = userDetailQuery.data;

  useEffect(() => {
    setPage(1);
    setSelectedUserId("");
  }, [selectedSegment]);

  const handleSelectSegment = (segment) => {
    setSelectedSegment(segment);
    setPage(1);
  };

  const handleOpenUser = (userId) => {
    setSelectedUserId(userId);
    setViewMode("user-detail");
  };

  return (
    <AdminShell title="用户分析" subtitle="看规模、分群和单个账号。">
      <div className="space-y-6">
        <AdminTabs items={VIEW_TABS} value={viewMode} onChange={setViewMode} />

        {viewMode === "stats" ? (
          <AnalyticsStatsSection
            statsQuery={statsQuery}
            stats={stats}
            statsCards={statsCards}
            getErrorMessage={getErrorMessage}
          />
        ) : null}

        {viewMode === "segments" ? (
          <AnalyticsSegmentsSection
            segmentFilters={SEGMENT_FILTERS}
            selectedSegment={selectedSegment}
            onSelectSegment={handleSelectSegment}
            segmentsQuery={segmentsQuery}
            users={users}
            pagination={pagination}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
            onOpenUser={handleOpenUser}
            getErrorMessage={getErrorMessage}
          />
        ) : null}

        {viewMode === "user-detail" ? (
          <AnalyticsUserDetailSection
            selectedSegment={selectedSegment}
            selectedUserId={selectedUserId}
            userDetailQuery={userDetailQuery}
            analytics={analytics}
            getErrorMessage={getErrorMessage}
            onBack={() => setViewMode("segments")}
          />
        ) : null}
      </div>
    </AdminShell>
  );
}
