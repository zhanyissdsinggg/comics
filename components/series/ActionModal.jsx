"use client";

export default function ActionModal({ open, title, description, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" role="dialog" aria-modal="true">
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
