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
      subtitle="这里只切换当前列表的排序方式，不会改动筛选条件或已选内容。"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4">
          <label className="text-sm font-semibold text-slate-700">{label}</label>
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
