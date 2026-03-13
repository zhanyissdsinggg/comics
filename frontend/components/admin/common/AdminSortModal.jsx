import React from 'react';
import { Modal } from './Modal';

export function AdminSortModal({
  isOpen,
  onClose,
  sortBy,
  onSortByChange,
  options,
  title = '筛选与排序',
  label = '排序字段',
  actionLabel = '应用',
}) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-neutral-400">{label}</label>
          <select
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100"
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
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      </div>
    </Modal>
  );
}
