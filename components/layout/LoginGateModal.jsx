"use client";

import ModalBase from "../common/ModalBase";

export default function LoginGateModal({ open, onClose, onConfirm }) {
  return (
    <ModalBase open={open} title="Login required" onClose={onClose}>
      <p>Sign in to access adult content.</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-neutral-700 px-4 py-2 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
        >
          Sign in
        </button>
      </div>
    </ModalBase>
  );
}
