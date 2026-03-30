import React from "react";
import { Modal } from "./Modal";
import { adminSelectClassName } from "./AdminWorkspacePrimitives";

export function AdminSortModal({
  isOpen,
  onClose,
  sortBy,
  onSortByChange,
  options,
  title = "Sort options",
  label = "Sort field",
  actionLabel = "Done",
}) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <div className="space-y-4">
        <div>
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

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {actionLabel}
        </button>
      </div>
    </Modal>
  );
}
