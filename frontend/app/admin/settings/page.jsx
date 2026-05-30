import Link from "next/link";
import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { AdminLayout } from "../../../components/admin/AdminLayout";

const primaryLinkClassName =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,248,0.94))] px-4 text-[0.84rem] font-semibold tracking-[-0.02em] text-slate-950 shadow-[0_14px_30px_rgba(255,79,154,0.1)] transition-[background-color,border-color,color,transform] duration-200 hover:-translate-y-[1px] hover:border-[color:var(--gush-border-strong)] hover:bg-white";

const secondaryLinkClassName =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[color:var(--gush-border)] bg-white/82 px-4 text-[0.84rem] font-semibold tracking-[-0.02em] text-slate-700 shadow-[0_12px_24px_rgba(49,25,77,0.06)] backdrop-blur-sm transition-[background-color,border-color,color,transform] duration-200 hover:-translate-y-[1px] hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950";

function SettingsCard({ eyebrow, title, children, action = null }) {
  return (
    <section className="rounded-[28px] border border-[color:var(--gush-border)] bg-white/82 p-6 shadow-[var(--gush-shadow-soft)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-lg font-semibold text-slate-950">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

function SettingsContent() {
  return (
    <div className="space-y-6">
      <SettingsCard
        eyebrow="Access"
        title="Session and sign-in model"
        action={
          <Link href="/admin/members" className={primaryLinkClassName}>
            <ShieldCheck className="size-4" />
            Open admin members
          </Link>
        }
      >
        <p>
          Admin sessions now prefer secure cookies instead of scattering tokens
          through URLs or long-lived browser storage.
        </p>
        <p className="mt-2">
          The normal login flow is already routed through
          <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">
            admin email + password
          </code>
          , while member identity, role, and verification state are resolved
          from the admin member directory.
        </p>
      </SettingsCard>

      <SettingsCard eyebrow="Identity" title="Admin member system">
        <p>
          Use the admin members page to maintain real operator records instead
          of relying on environment variables as the long-term source of truth.
        </p>
        <ul className="mt-4 space-y-2">
          <li>Super admins can access every workspace and manage team access.</li>
          <li>Content operators focus on series, episodes, creators, comments, and merchandising.</li>
          <li>Support operators handle users, tickets, notifications, and moderation queues.</li>
          <li>Finance operators stay inside orders, revenue, billing, and package controls.</li>
          <li>Marketing operators manage promotions, campaigns, recommendations, and storefront placements.</li>
          <li>System operators maintain branding, email, regions, logs, and global settings.</li>
        </ul>
      </SettingsCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard eyebrow="Bootstrap" title="What still relies on environment flags?">
          <p>
            <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">
              ADMIN_PASSWORD_AUTH_ENABLED
            </code>
            must stay enabled for the member email/password login path to work.
          </p>
          <p className="mt-2">
            <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">
              ADMIN_KEYS
            </code>
            and
            <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">
              ADMIN_ROLE_ASSIGNMENTS
            </code>
            remain as bootstrap and emergency compatibility switches.
          </p>
          <div className="mt-4 rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/82 p-4 font-mono text-xs leading-6 text-slate-700">
            ADMIN_PASSWORD_AUTH_ENABLED=true
            <br />
            ADMIN_KEYS=bootstrap-key-a,bootstrap-key-b
            <br />
            ADMIN_ROLE_ASSIGNMENTS=1:super_admin,2:content_admin
          </div>
        </SettingsCard>

        <SettingsCard
          eyebrow="Operating Model"
          title="What the admin stack currently covers"
          action={
            <Link href="/admin/members" className={secondaryLinkClassName}>
              <SlidersHorizontal className="size-4" />
              Review members and roles
            </Link>
          }
        >
          <ul className="space-y-2">
            <li>Series, episodes, creators, placements, promotions, orders, and notifications all support day-to-day operations.</li>
            <li>The admin members workspace is now the primary place to maintain real operator records.</li>
            <li>Disabling a member removes backend access on the next auth refresh or session renewal.</li>
            <li>Future work can expand creator metadata and deeper editorial curation without changing this access model.</li>
          </ul>
        </SettingsCard>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AdminLayout
      title="System Settings"
      subtitle="Review how admin access, member governance, and operational boundaries are wired today."
    >
      <SettingsContent />
    </AdminLayout>
  );
}
