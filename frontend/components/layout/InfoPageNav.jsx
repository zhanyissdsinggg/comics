"use client";

import Link from "next/link";

const INFO_LINKS = [
  { key: "about", href: "/about", label: "About" },
  { key: "faq", href: "/faq", label: "FAQ" },
  { key: "support", href: "/support", label: "Contact" },
  { key: "privacy", href: "/privacy-policy", label: "Privacy" },
  { key: "terms", href: "/terms-of-service", label: "Terms" },
];

export default function InfoPageNav({ current, appearance = "default" }) {
  const isLight = appearance === "light";

  return (
    <nav aria-label="Information pages" className="overflow-x-auto">
      <div
        className={`inline-flex min-w-full gap-2 rounded-2xl border p-2 backdrop-blur-xl sm:min-w-0 ${
          isLight
            ? "border-black/6 bg-white/80 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
            : "border-white/10 bg-white/5"
        }`}
      >
        {INFO_LINKS.map((item) => {
          const isActive = item.key === current;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                isActive
                  ? isLight
                    ? "bg-slate-950 text-white"
                    : "bg-white text-neutral-950"
                  : isLight
                    ? "text-slate-500 hover:bg-[#f8f9fc] hover:text-slate-950"
                    : "text-neutral-300 hover:bg-white/10 hover:text-white"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
