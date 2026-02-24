import { Suspense } from "react";
import AdminShell from "../../../components/admin/AdminShell";
import Skeleton from "../../../components/common/Skeleton";

function SettingsContent() {
  return (
    <AdminShell title="System Settings" subtitle="Admin access and environment info.">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Admin Access</h2>
          <p className="mt-2 text-sm text-slate-600">
            Provide the admin key via query, header, or bearer token. Example:
            <span className="ml-1 font-mono">/admin?key=admin</span>
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Environment</h2>
          <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Backend API</p>
              <p className="mt-2">http://localhost:4000</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Swagger</p>
              <p className="mt-2">/api/docs</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Metrics Rules</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Views: recorded when episode content is requested.</li>
            <li>Registrations: recorded on successful signup.</li>
            <li>DAU: unique signed-in users with activity that day.</li>
          </ul>
        </section>
      </div>
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
      <SettingsContent />
    </Suspense>
  );
}
