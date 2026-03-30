"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Clock,
  CreditCard,
  Globe,
  LifeBuoy,
  Mail,
  Megaphone,
  MessageSquare,
  PenSquare,
  Radar,
  Receipt,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";

const RECENT_SEARCH_STORAGE_KEY = "admin_recent_searches";

const SEARCH_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin",
    icon: BookOpen,
    keywords: ["dashboard", "overview", "workspace", "home"],
  },
  {
    id: "series",
    label: "Series",
    href: "/admin/series",
    icon: BookOpen,
    keywords: ["series", "story", "comic", "novel", "catalog"],
  },
  {
    id: "storefront",
    label: "Storefront Audit",
    href: "/admin/storefront",
    icon: Search,
    keywords: ["storefront", "audit", "readiness", "public page"],
  },
  {
    id: "merchandising",
    label: "Collections",
    href: "/admin/merchandising",
    icon: Sparkles,
    keywords: ["collections", "home", "curation", "featured"],
  },
  {
    id: "users",
    label: "Users",
    href: "/admin/users",
    icon: Users,
    keywords: ["users", "accounts", "reader", "customer"],
  },
  {
    id: "orders",
    label: "Orders",
    href: "/admin/orders",
    icon: Receipt,
    keywords: ["orders", "payments", "transactions"],
  },
  {
    id: "promotions",
    label: "Promotions",
    href: "/admin/promotions",
    icon: Megaphone,
    keywords: ["promotions", "marketing", "campaigns"],
  },
  {
    id: "comments",
    label: "Comments",
    href: "/admin/comments",
    icon: MessageSquare,
    keywords: ["comments", "reviews", "feedback"],
  },
  {
    id: "billing",
    label: "Billing",
    href: "/admin/billing",
    icon: CreditCard,
    keywords: ["billing", "pricing", "wallet", "commercial"],
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
    keywords: ["notifications", "messages", "alerts"],
  },
  {
    id: "support",
    label: "Support",
    href: "/admin/support",
    icon: LifeBuoy,
    keywords: ["support", "tickets", "help"],
  },
  {
    id: "creators",
    label: "Creators",
    href: "/admin/creators",
    icon: PenSquare,
    keywords: ["creators", "author", "artist", "studio", "credits"],
  },
  {
    id: "branding",
    label: "Branding",
    href: "/admin/branding",
    icon: BookOpen,
    keywords: ["branding", "logo", "banner", "assets"],
  },
  {
    id: "email-settings",
    label: "Email Settings",
    href: "/admin/email-settings",
    icon: Mail,
    keywords: ["email", "smtp", "mail settings"],
  },
  {
    id: "email-jobs",
    label: "Email Jobs",
    href: "/admin/email-jobs",
    icon: Mail,
    keywords: ["email", "deliveries", "jobs"],
  },
  {
    id: "tracking",
    label: "Tracking",
    href: "/admin/tracking",
    icon: Radar,
    keywords: ["tracking", "analytics", "pixels"],
  },
  {
    id: "regions",
    label: "Regions",
    href: "/admin/regions",
    icon: Globe,
    keywords: ["regions", "country", "locale"],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    keywords: ["settings", "system", "configuration"],
  },
];

function getSearchItemById(id) {
  return SEARCH_ITEMS.find((item) => item.id === id) ?? null;
}

function readRecentSearchIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
    const ids = JSON.parse(raw || "[]");
    return Array.isArray(ids) ? ids.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeRecentSearchIds(ids) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(ids));
}

export default function GlobalSearch({ isOpen, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearchIds, setRecentSearchIds] = useState([]);

  const results = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return [];
    }

    return SEARCH_ITEMS.filter((item) => {
      if (item.label.toLowerCase().includes(trimmedQuery)) {
        return true;
      }

      return item.keywords.some((keyword) => keyword.toLowerCase().includes(trimmedQuery));
    });
  }, [query]);

  const recentItems = useMemo(
    () => recentSearchIds.map((id) => getSearchItemById(id)).filter(Boolean),
    [recentSearchIds],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setRecentSearchIds(readRecentSearchIds().slice(0, 5));
    setSelectedIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleNavigate = (item) => {
    const nextRecentIds = [item.id, ...recentSearchIds.filter((id) => id !== item.id)].slice(
      0,
      5,
    );
    setRecentSearchIds(nextRecentIds);
    writeRecentSearchIds(nextRecentIds);
    setQuery("");
    onClose();
    router.push(item.href);
  };

  const handleClearRecent = () => {
    setRecentSearchIds([]);
    writeRecentSearchIds([]);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleNavigate(results[selectedIndex]);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[rgba(20,27,36,0.28)] p-4 pt-[10vh] backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-black/8 bg-[rgba(255,255,255,0.94)] shadow-[var(--gush-shadow-panel)]">
        <div className="border-b border-black/6 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]">
              <Search size={20} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, tools, or settings"
              className="flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white text-slate-500 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === selectedIndex;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item)}
                    className={`group flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-all ${
                      isActive
                        ? "bg-[rgba(47,88,198,0.06)] text-slate-950"
                        : "text-slate-700 hover:bg-[rgba(15,23,42,0.04)] hover:text-slate-950"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-black/6 bg-[rgba(250,247,241,0.9)] text-slate-500 transition-all group-hover:text-[var(--gush-accent,#2f58c6)]">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{item.label}</div>
                      <div className="truncate text-xs text-slate-500">{item.href}</div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </button>
                );
              })}
            </div>
          ) : query ? (
            <div className="py-12 text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.9)] text-slate-400">
                  <Search size={28} />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900">No matching admin pages</p>
              <p className="mt-1 text-xs text-slate-500">
                Try a different keyword or page name.
              </p>
            </div>
          ) : recentItems.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Recent
                </div>
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className="text-xs text-slate-500 transition-colors hover:text-slate-950"
                >
                  Clear
                </button>
              </div>
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item)}
                  className="group flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left text-slate-700 transition-all hover:bg-[rgba(15,23,42,0.04)] hover:text-slate-950"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-black/6 bg-[rgba(250,247,241,0.9)] text-slate-400 transition-all group-hover:text-[var(--gush-accent,#2f58c6)]">
                    <Clock size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{item.label}</div>
                    <div className="truncate text-xs text-slate-500">{item.href}</div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.9)] text-slate-400">
                  <Search size={28} />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900">Start typing to search admin</p>
              <p className="mt-1 text-xs text-slate-500">
                Search by page name, task, or object type.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-black/6 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className="rounded-lg border border-black/8 bg-[rgba(250,247,241,0.9)] px-1.5 py-0.5 font-medium">
                  ↑
                </kbd>
                <kbd className="rounded-lg border border-black/8 bg-[rgba(250,247,241,0.9)] px-1.5 py-0.5 font-medium">
                  ↓
                </kbd>
                <span>Move</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="rounded-lg border border-black/8 bg-[rgba(250,247,241,0.9)] px-1.5 py-0.5 font-medium">
                  Enter
                </kbd>
                <span>Open</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded-lg border border-black/8 bg-[rgba(250,247,241,0.9)] px-1.5 py-0.5 font-medium">
                Esc
              </kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
