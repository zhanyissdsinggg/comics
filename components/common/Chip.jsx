export default function Chip({ children, className = "" }) {
  return (
    <span
      className={`rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300 ${className}`.trim()}
    >
      {children}
    </span>
  );
}
