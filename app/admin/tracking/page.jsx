import { Suspense } from "react";
import AdminShell from "../../../components/admin/AdminShell";
import TrackingSettings from "../../../components/tracking/TrackingSettings";
import Skeleton from "../../../components/common/Skeleton";

function TrackingContent() {
  return (
    <AdminShell title="Tracking Settings" subtitle="Manage tracking providers and runtime config.">
      <TrackingSettings />
    </AdminShell>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950">
          <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
            <Skeleton className="h-10 w-56 rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
