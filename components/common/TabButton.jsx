export default function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm font-semibold ${
        active ? "text-white" : "text-neutral-400"
      }`}
    >
      {children}
    </button>
  );
}
