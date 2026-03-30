import { AdminLayout } from "../../../components/admin/AdminLayout";

function SettingsContent() {
  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-black/8 bg-white p-6 shadow-[var(--gush-shadow-soft)]">
        <h2 className="text-lg font-semibold">Admin access</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Admin authentication runs through a shared HttpOnly cookie session. Avoid passing tokens through URL params, local storage, or hand-built bearer flows for this workspace.
        </p>
      </section>

      <section className="rounded-[24px] border border-black/8 bg-white p-6 shadow-[var(--gush-shadow-soft)]">
        <h2 className="text-lg font-semibold">Environment notes</h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-[18px] border border-black/8 bg-[rgba(250,247,241,0.82)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Backend API
            </p>
            <p className="mt-2">
              Read from <code>API_BASE_URL</code> first, with{" "}
              <code>NEXT_PUBLIC_API_BASE_URL</code> still supported for compatibility.
            </p>
          </div>
          <div className="rounded-[18px] border border-black/8 bg-[rgba(250,247,241,0.82)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              API docs
            </p>
            <p className="mt-2">
              When backend docs are exposed, visit <code>/api/docs</code> for the live Swagger reference.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-black/8 bg-white p-6 shadow-[var(--gush-shadow-soft)]">
        <h2 className="text-lg font-semibold">Metric notes</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <li>View counts are recorded after an episode request returns successfully.</li>
          <li>Registration counts increase once a new account is created successfully.</li>
          <li>DAU tracks unique signed-in users who triggered activity on the selected day.</li>
        </ul>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <AdminLayout
      title="System Settings"
      subtitle="Reference notes for admin access, environment wiring, and the core metric definitions used across this workspace."
    >
      <SettingsContent />
    </AdminLayout>
  );
}
