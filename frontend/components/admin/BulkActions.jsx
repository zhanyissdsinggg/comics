"use client";

import { useState } from "react";

export function BulkActions({
  selectedIds = [],
  onDelete = null,
  onUpdate = null,
  onExport = null,
  onImport = null,
  loading = false,
  actions = [],
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (selectedIds.length === 0) {
    return null;
  }

  const confirmDelete = async () => {
    setShowConfirm(false);
    if (onDelete) {
      await onDelete(selectedIds);
    }
  };

  const handleCustomAction = async (action) => {
    if (typeof action?.handler === "function") {
      await action.handler(selectedIds);
    }
  };

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
      <div className="flex-1">
        <span className="text-sm text-emerald-400">Selected {selectedIds.length} items</span>
      </div>

      <div className="flex items-center gap-2">
        {onExport ? (
          <button
            onClick={() => onExport(selectedIds)}
            disabled={loading}
            className="rounded border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm text-blue-400 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export
          </button>
        ) : null}

        {onImport ? (
          <button
            onClick={() => onImport(selectedIds)}
            disabled={loading}
            className="rounded border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-sm text-purple-400 transition-colors hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Import
          </button>
        ) : null}

        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleCustomAction(action)}
            disabled={loading}
            className={`rounded border px-3 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              action.className || "border-neutral-500/20 bg-neutral-500/10 text-neutral-400 hover:bg-neutral-500/20"
            }`}
          >
            {action.icon ? `${action.icon} ` : ""}
            {action.label}
          </button>
        ))}

        {onUpdate ? (
          <button
            onClick={() => onUpdate(selectedIds)}
            disabled={loading}
            className="rounded border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-400 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Update
          </button>
        ) : null}

        {onDelete ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={loading}
            className="rounded border border-red-500/20 bg-red-500/10 px-3 py-1 text-sm text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete
          </button>
        ) : null}
      </div>

      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-w-sm rounded-lg border border-white/10 bg-neutral-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Confirm Deletion</h3>
            <p className="mb-6 text-neutral-400">
              Delete {selectedIds.length} selected items? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded border border-white/10 px-4 py-2 text-neutral-300 transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="rounded border border-red-500/30 bg-red-500/20 px-4 py-2 text-red-400 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BulkActions;
