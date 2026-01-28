"use client";

export default function ModalBase({ open, title, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="mt-4 space-y-4 text-sm text-neutral-300">{children}</div>
      </div>
    </div>
  );
}
