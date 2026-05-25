"use client";

export const dynamic = "force-dynamic";

import AdminInteractiveStoriesPage from "@/components/admin/AdminInteractiveStoriesPage";

export default async function AdminInteractiveStoriesDetailRoute({ params }) {
  const resolvedParams = await params;
  return (
    <AdminInteractiveStoriesPage
      initialStoryId={resolvedParams?.id || ""}
      initialActiveTab="story"
    />
  );
}
