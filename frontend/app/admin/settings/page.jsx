import { AdminLayout } from '../../../components/admin/AdminLayout';

function SettingsContent() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Admin Access</h2>
        <p className="mt-2 text-sm text-slate-600">
          Admin authentication can be provided through query parameters, request headers, or a bearer token.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Environment</h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Backend API</p>
            <p className="mt-2">Reads from `API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Swagger</p>
            <p className="mt-2">Available at `/api/docs`.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Metrics Rules</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>Views: counted when an episode payload is requested.</li>
          <li>Registrations: counted when a new account is created successfully.</li>
          <li>DAU: unique logged-in users with activity on the current day.</li>
        </ul>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <AdminLayout
      title="System Settings"
      subtitle="Reference notes for admin access, environment variables, and analytics definitions."
    >
      <SettingsContent />
    </AdminLayout>
  );
}
