export default function SkeletonCard({ appearance = "default" }) {
  const isLight = appearance === "light";
  const blockClass = isLight
    ? "bg-slate-200"
    : "bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)]";

  return (
    <div className="animate-pulse rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.025)_100%)] p-3.5 shadow-[0_18px_38px_rgba(8,6,20,0.22)] backdrop-blur-xl">
      <div className={`${blockClass} mb-3 aspect-[2/3] rounded-lg`} />
      <div className={`${blockClass} mb-2 h-4 w-3/4 rounded`} />
      <div className={`${blockClass} h-3 w-1/2 rounded`} />
    </div>
  );
}
