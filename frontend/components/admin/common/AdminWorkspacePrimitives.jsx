"use client";

import SurfacePanel from "@/components/common/SurfacePanel";
import { cn } from "@/lib/utils";

export const adminInputClassName =
  "h-11 w-full rounded-[20px] border border-[color:var(--gush-border)] bg-white px-4 text-sm text-slate-950 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-[color:var(--gush-border-strong)] focus:ring-[3px] focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-60";

export const adminTextareaClassName =
  "w-full rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-[color:var(--gush-border-strong)] focus:ring-[3px] focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-60";

export const adminSelectClassName =
  "h-11 w-full rounded-[20px] border border-[color:var(--gush-border)] bg-white px-4 text-sm text-slate-950 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-[color:var(--gush-border-strong)] focus:ring-[3px] focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-60";

const badgeToneClasses = {
  default: "border-[color:var(--gush-border)] bg-white text-slate-600",
  accent: "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
};

export function AdminPageSection({
  title,
  description,
  action = null,
  children,
  accent = "blue",
  className = "",
  tone = "default",
}) {
  return (
    <SurfacePanel appearance="light" tone={tone} accent={accent} className={className}>
      {title || description || action ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-[1.2rem] font-semibold tracking-tight text-slate-950 sm:text-[1.35rem]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn(title || description || action ? "mt-5" : "", className ? "" : "")}>
        {children}
      </div>
    </SurfacePanel>
  );
}

export function AdminMetricCard({ label, value, detail, tone = "default", className = "" }) {
  return (
    <div
      className={cn(
        "rounded-[24px] border px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]",
        tone === "accent"
          ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)]"
          : "border-[color:var(--gush-border)] bg-white/92",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 text-[1.85rem] font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p> : null}
    </div>
  );
}

export function AdminBadge({ children, tone = "default", className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        badgeToneClasses[tone] || badgeToneClasses.default,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AdminFormField({ label, helperText, children, className = "" }) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {helperText ? <span className="block text-xs leading-5 text-slate-500">{helperText}</span> : null}
    </label>
  );
}

export function AdminKeyValueList({ items, className = "" }) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between gap-4 border-b border-[color:var(--gush-border)] py-3 last:border-b-0 last:pb-0"
        >
          <span className="text-sm text-slate-500">{item.label}</span>
          <span className="text-sm font-medium text-slate-950">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminTabs({ items, value, onChange, className = "" }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              isActive
                ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)] text-slate-950"
                : "border-[color:var(--gush-border)] bg-white text-slate-600 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function AdminDataTable({ className = "", children }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border border-[color:var(--gush-border)] bg-white/96 shadow-[var(--gush-shadow-soft)]",
        className,
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function AdminTableHeader({ children }) {
  return (
    <thead className="bg-[color:var(--gush-page-bg-muted)] text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
      {children}
    </thead>
  );
}

export function AdminTableRow({ children, className = "" }) {
  return (
    <tr
      className={cn(
        "border-t border-[color:var(--gush-border)] align-top text-sm text-slate-700 transition hover:bg-[color:var(--gush-page-bg-muted)]",
        className,
      )}
    >
      {children}
    </tr>
  );
}
