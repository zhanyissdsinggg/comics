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
  Radar,
  Receipt,
  Search,
  Settings,
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
    keywords: ["dashboard", "overview", "analytics", "stats"],
  },
  {
    id: "series",
    label: "Titles",
    href: "/admin/series",
    icon: BookOpen,
    keywords: ["titles", "series", "comics", "novels", "content"],
  },
  {
    id: "users",
    label: "Users",
    href: "/admin/users",
    icon: Users,
    keywords: ["users", "customers", "accounts", "members"],
  },
  {
    id: "orders",
    label: "Orders",
    href: "/admin/orders",
    icon: Receipt,
    keywords: ["orders", "payments", "transactions", "billing"],
  },
  {
    id: "promotions",
    label: "Promotions",
    href: "/admin/promotions",
    icon: Megaphone,
    keywords: ["promotions", "campaigns", "offers", "discounts"],
  },
  {
    id: "comments",
    label: "Comments",
    href: "/admin/comments",
    icon: MessageSquare,
    keywords: ["comments", "reviews", "ratings", "feedback"],
  },
  {
    id: "billing",
    label: "Billing Packages",
    href: "/admin/billing",
    icon: CreditCard,
    keywords: ["billing", "packages", "pricing", "points"],
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
    id: "branding",
    label: "Brand Settings",
    href: "/admin/branding",
    icon: BookOpen,
    keywords: ["branding", "assets", "brand", "images"],
  },
  {
    id: "email-settings",
    label: "Email Settings",
    href: "/admin/email-settings",
    icon: Mail,
    keywords: ["email", "smtp", "mail", "settings"],
  },
  {
    id: "email-jobs",
    label: "Email Jobs",
    href: "/admin/email-jobs",
    icon: Mail,
    keywords: ["email", "jobs", "delivery", "mail"],
  },
  {
    id: "tracking",
    label: "Tracking",
    href: "/admin/tracking",
    icon: Radar,
    keywords: ["tracking", "pixels", "analytics", "events"],
  },
  {
    id: "regions",
    label: "Regions",
    href: "/admin/regions",
    icon: Globe,
    keywords: ["regions", "countries", "pricing", "locale"],
  },
  {
    id: "settings",
    label: "System Settings",
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
    [recentSearchIds]
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
    const nextRecentIds = [item.id, ...recentSearchIds.filter((id) => id !== item.id)].slice(0, 5);
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 pt-[10vh] backdrop-blur-md">
      <div className="w-full max-w-2xl animate-scale-in overflow-hidden rounded-[2rem] border border-ios-gray-800 bg-neutral-900/95 shadow-ios-xl backdrop-blur-2xl">
        <div className="border-b border-ios-gray-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-ios-green/10 text-ios-green">
              <Search size={20} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search admin pages"
              className="flex-1 bg-transparent text-base text-neutral-100 outline-none placeholder:text-ios-gray-500"
            />
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-3xl bg-ios-gray-800 text-ios-gray-400 transition-all duration-300 hover:bg-ios-gray-700 hover:text-neutral-100"
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
                    className={`group flex w-full items-center gap-3 rounded-4xl px-4 py-3 text-left transition-all duration-300 ${
                      isActive
                        ? "bg-ios-green/15 text-ios-green"
                        : "text-neutral-200 hover:bg-ios-green/10 hover:text-ios-green"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-ios-gray-800 transition-all duration-300 group-hover:bg-ios-green/10">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{item.label}</div>
                      <div className="truncate text-xs text-ios-gray-500">{item.href}</div>
                    </div>
                    <ArrowRight size={16} className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          ) : query ? (
            <div className="py-12 text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-4xl bg-ios-gray-800 text-ios-gray-500">
                  <Search size={28} />
                </div>
              </div>
              <p className="text-sm font-medium text-ios-gray-400">No matching pages found.</p>
              <p className="mt-1 text-xs text-ios-gray-500">Try a different keyword.</p>
            </div>
          ) : recentItems.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-ios-green/60">Recent</div>
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className="text-xs text-ios-gray-500 transition-colors duration-300 hover:text-ios-green"
                >
                  Clear
                </button>
              </div>
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item)}
                  className="group flex w-full items-center gap-3 rounded-4xl px-4 py-3 text-left text-neutral-200 transition-all duration-300 hover:bg-ios-green/10 hover:text-ios-green"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-ios-gray-800 transition-all duration-300 group-hover:bg-ios-green/10">
                    <Clock size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.label}</div>
                    <div className="truncate text-xs text-ios-gray-500">{item.href}</div>
                  </div>
                  <ArrowRight size={16} className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-4xl bg-ios-gray-800 text-ios-gray-500">
                  <Search size={28} />
                </div>
              </div>
              <p className="text-sm font-medium text-ios-gray-400">Start typing to search.</p>
              <p className="mt-1 text-xs text-ios-gray-500">Use a page name, keyword, or route intent.</p>
            </div>
          )}
        </div>

        <div className="border-t border-ios-gray-800 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ios-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">Up</kbd>
                <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">Down</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">Enter</kbd>
                <span>Open</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
