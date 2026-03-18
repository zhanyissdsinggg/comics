export default function SkeletonCard({ appearance = "default" }) {
  const isLight = appearance === "light";
  const blockClass = isLight ? "bg-slate-200" : "bg-gray-700/50";

  return (
    <div className="animate-pulse">
      <div className={`${blockClass} mb-3 aspect-[2/3] rounded-lg`} />
      <div className={`${blockClass} mb-2 h-4 w-3/4 rounded`} />
      <div className={`${blockClass} h-3 w-1/2 rounded`} />
    </div>
  );
}
