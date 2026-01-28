export default function IconButton({ label, children, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-200 transition hover:border-neutral-600"
    >
      {children}
    </button>
  );
}
