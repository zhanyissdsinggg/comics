"use client";

export default function StorefrontPathwaysGrid({
  cards = [],
  columnsClassName = "md:grid-cols-2 xl:grid-cols-4",
  className = "",
}) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return null;
  }

  return (
    <div className={`grid gap-4 ${columnsClassName} ${className}`.trim()}>
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={card.onClick}
          className={`group rounded-[26px] border p-5 text-left transition-all duration-300 hover:-translate-y-1 ${card.accentClass}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-current opacity-75">
            {card.eyebrow}
          </p>
          <h3 className="mt-4 font-display text-xl font-semibold leading-tight text-white">
            {card.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-neutral-300">{card.description}</p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-current">
            <span>{card.cta || card.ctaLabel}</span>
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              &gt;
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
