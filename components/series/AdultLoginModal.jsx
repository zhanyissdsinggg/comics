"use client";

export default function AdultLoginModal({ open, onClose, onConfirm }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" role="dialog" aria-modal="true">
        <h3>Login required</h3>
        <p>Sign in to access adult content.</p>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
