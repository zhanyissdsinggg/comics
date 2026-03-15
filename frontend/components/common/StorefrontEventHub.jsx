"use client";

function EventCard({ event, priority = "secondary" }) {
  const baseClassName =
    priority === "lead"
      ? "rounded-[30px] border p-6 text-left transition-all duration-300 hover:-translate-y-1"
      : "rounded-[24px] border p-5 text-left transition-all duration-300 hover:-translate-y-1";

  return (
    <button
      type="button"
      onClick={event.onClick}
      className={`group ${baseClassName} ${event.accentClass}`.trim()}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-current opacity-75">
            {event.eyebrow}
          </p>
          <h3
            className={`mt-3 font-display font-semibold tracking-tight text-white ${
              priority === "lead" ? "text-3xl leading-tight sm:text-[2.2rem]" : "text-xl leading-tight"
            }`}
          >
            {event.title}
          </h3>
        </div>
        {event.signalValue ? (
          <div className="min-w-[120px] rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
              {event.signalLabel || "Signal"}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
              {event.signalValue}
            </p>
            {event.signalHint ? (
              <p className="mt-2 text-xs leading-5 text-neutral-400">{event.signalHint}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <p
        className={`mt-4 text-neutral-300 ${
          priority === "lead" ? "max-w-3xl text-sm leading-7" : "text-sm leading-6"
        }`}
      >
        {event.description}
      </p>

      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-current">
        <span>{event.ctaLabel}</span>
        <span
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-1"
        >
          &gt;
        </span>
      </div>
    </button>
  );
}

export default function StorefrontEventHub({
  eyebrow,
  title,
  description,
  events = [],
  className = "",
}) {
  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }

  const [leadEvent, ...secondaryEvents] = events;

  return (
    <section
      className={`relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_24px_100px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-6 ${className}`.trim()}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.12),transparent_22%)]" />
      <div className="relative">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-300/85">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-neutral-300">{description}</p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <EventCard event={leadEvent} priority="lead" />
          {secondaryEvents.length > 0 ? (
            <div className={`grid gap-4 ${secondaryEvents.length > 1 ? "md:grid-cols-2 xl:grid-cols-1" : ""}`.trim()}>
              {secondaryEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
