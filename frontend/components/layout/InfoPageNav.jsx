"use client";

import Link from "next/link";

const INFO_LINKS = [
  { key: "about", href: "/about", label: "About" },
  { key: "faq", href: "/faq", label: "FAQ" },
  { key: "support", href: "/support", label: "Support" },
  { key: "privacy", href: "/privacy-policy", label: "Privacy" },
  { key: "terms", href: "/terms-of-service", label: "Terms" },
];

export default function InfoPageNav({ current }) {
  return (
    <nav aria-label="Information pages" className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl sm:min-w-0">
        {INFO_LINKS.map((item) => {
          const isActive = item.key === current;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                isActive
                  ? "bg-white text-neutral-950"
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
