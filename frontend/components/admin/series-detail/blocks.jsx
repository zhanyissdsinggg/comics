"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";

import {
  AdminBadge,
  AdminFormField,
  adminCheckboxClassName,
  adminInputClassName,
  adminSelectClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";

export function ReadinessCheckCard({ item }) {
  return (
    <div className="rounded-[20px] border border-[color:var(--gush-border)] bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">{item.label}</p>
        <AdminBadge tone={item.ok ? "success" : "warning"}>
          {item.ok ? "已就绪" : "待处理"}
        </AdminBadge>
      </div>
      <p className="mt-2 text-xs leading-6 text-slate-500">{item.hint}</p>
    </div>
  );
}

export function StatusToggleCard({ label, checked, disabled, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4 text-sm text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={adminCheckboxClassName}
      />
    </label>
  );
}

export function CreditDraftCard({
  credit,
  index,
  isEditing,
  roleOptions,
  typeOptions,
  onFieldChange,
  onRemove,
}) {
  return (
    <div className="rounded-[26px] border border-[color:var(--gush-border)] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.032)] ring-1 ring-black/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-950">署名 {index + 1}</p>
          {credit.isPrimary ? <AdminBadge tone="accent">主署名</AdminBadge> : null}
          <AdminBadge tone={credit.isPublic ? "success" : "warning"}>
            {credit.isPublic ? "公开" : "仅后台"}
          </AdminBadge>
        </div>
        <button
          type="button"
          onClick={() => onRemove(credit.id)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 transition hover:text-rose-700"
        >
          <Trash2 className="size-4" />
          删除
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminFormField label="公开署名">
          <input
            type="text"
            value={credit.name}
            disabled={!isEditing}
            onChange={(event) => onFieldChange(credit.id, "name", event.target.value)}
            className={adminInputClassName}
          />
        </AdminFormField>
        <AdminFormField label="角色">
          <select
            value={credit.role}
            disabled={!isEditing}
            onChange={(event) => onFieldChange(credit.id, "role", event.target.value)}
            className={adminSelectClassName}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdminFormField>
        <AdminFormField label="创作者类型">
          <select
            value={credit.type}
            disabled={!isEditing}
            onChange={(event) => onFieldChange(credit.id, "type", event.target.value)}
            className={adminSelectClassName}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdminFormField>
        <AdminFormField label="排序">
          <input
            type="number"
            min="0"
            value={credit.sortOrder}
            disabled={!isEditing}
            onChange={(event) => onFieldChange(credit.id, "sortOrder", event.target.value)}
            className={adminInputClassName}
          />
        </AdminFormField>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex items-center justify-between rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4 text-sm text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
          <span className="flex items-center gap-2">
            <Eye className="size-4 text-slate-500" />
            对前台公开
          </span>
          <input
            type="checkbox"
            checked={credit.isPublic}
            disabled={!isEditing}
            onChange={(event) => onFieldChange(credit.id, "isPublic", event.target.checked)}
            className={adminCheckboxClassName}
          />
        </label>
        <label className="flex items-center justify-between rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4 text-sm text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
          <span className="flex items-center gap-2">
            {credit.isPrimary ? (
              <Eye className="size-4 text-slate-950" />
            ) : (
              <EyeOff className="size-4 text-slate-500" />
            )}
            设为主署名
          </span>
          <input
            type="checkbox"
            checked={credit.isPrimary}
            disabled={!isEditing}
            onChange={(event) => onFieldChange(credit.id, "isPrimary", event.target.checked)}
            className={adminCheckboxClassName}
          />
        </label>
      </div>
    </div>
  );
}
