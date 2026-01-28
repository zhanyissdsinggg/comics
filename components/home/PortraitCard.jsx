import Cover from "../common/Cover";
import Pill from "../common/Pill";

export default function PortraitCard({ item, tone }) {
  return (
    <div className="scroll-snap-item min-w-[140px] rounded-2xl border border-neutral-900 bg-neutral-900/50 p-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
        <Cover tone={tone || item.coverTone} coverUrl={item.coverUrl} className="h-full w-full" />
        {item.badge ? (
          <div className="absolute left-2 top-2">
            <Pill>{item.badge}</Pill>
          </div>
        ) : null}
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-sm font-semibold">{item.title}</p>
        <p className="text-xs text-neutral-400">{item.subtitle}</p>
      </div>
    </div>
  );
}
