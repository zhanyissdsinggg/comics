import React from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "./Modal";
import { adminSelectClassName } from "./AdminWorkspacePrimitives";

export function AdminSortModal({
  isOpen,
  onClose,
  sortBy,
  onSortByChange,
  options,
  title = "排序设置",
  label = "排序字段",
  actionLabel = "完成",
}) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      subtitle="只调整当前列表排序。"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
          <label className="text-sm font-semibold text-slate-700">
            {label}
          </label>
          <select
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value)}
            className={`mt-2 ${adminSelectClassName}`}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={onClose}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
