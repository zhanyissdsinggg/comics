"use client";

import { use } from "react";

export const dynamic = "force-dynamic";

import AdminInteractiveStoriesPage from "@/components/admin/AdminInteractiveStoriesPage";

export default function AdminInteractiveStoriesNodesRoute({ params }) {
  const resolvedParams = use(params);
  return (
    <AdminInteractiveStoriesPage
      initialStoryId={resolvedParams?.id || ""}
      initialActiveTab="nodes"
    />
  );
}
