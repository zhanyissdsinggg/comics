"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Gamepad2,
  Gift,
  History,
  Lock,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { siteConfig } from "../../lib/siteConfig";
import { useNotificationsStore } from "../../store/useNotificationsStore";
import { WalletProvider, useWalletStore } from "../../store/useWalletStore";
import { useFigmaSite } from "./FigmaSiteContext";
import {
  FIGMA_CONTENT_OPTIONS,
  FIGMA_CONTENT_TYPES,
  buildNotificationCards,
  cn,
  formatWalletTotal,
} from "./figma-utils";

const DEFAULT_TRENDING_TAGS = [
  "Solo Leveling",
  "Romance",
  "Cyberpunk",
  "Vampire",
  "Horror",
  "System",
];

const DEFAULT_SEARCH_SUGGESTIONS = [
  {
    id: "search-home",
    title: "Trending Comics",
    subtitle: "Start with the hottest series on the front page.",
    href: "/",
    label: "Home",
  },
  {
    id: "search-novels",
    title: "Fresh Novel Drops",
    subtitle: "Browse prose-heavy stories and latest updates.",
    href: "/novels",
    label: "Novels",
  },
  {
    id: "search-interactive",
    title: "Interactive Story Paths",
    subtitle: "Branching episodes and choice-driven chaos.",
    href: "/search?format=interactive",
    label: "Interactive",
  },
];

function buildAvatarUrl(displayName, user) {
  const explicitAvatar =
    String(user?.avatarUrl || user?.imageUrl || user?.photoUrl || "").trim();
  if (explicitAvatar) {
    return explicitAvatar;
  }

  const initials = String(displayName || "ME")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return `https://placehold.co/100x100/111827/f8fafc?text=${encodeURIComponent(initials || "ME")}`;
}

function buildSearchSuggestionItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (!item) {
        return null;
      }

      if (item.href && item.title) {
        return item;
      }

      const href = String(item?.detailHref || item?.readHref || "").trim();
      const title = String(item?.title || "").trim();
      if (!href || !title) {
        return null;
      }

      return {
        id: item.id || href,
        title,
        subtitle: item.author || item.chapterLabel || "Story pick",
        href,
        label: item.kind || "Story",
        coverUrl: item.coverUrl || "",
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function FigmaAgeGateModal() {
  const {
    palette,
    showAgeGate,
    setShowAgeGate,
    legalAge,
    confirmAdultMode,
  } = useFigmaSite();

  if (!showAgeGate) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-900/40 bg-[#121212] p-8 shadow-2xl">
        <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-red-600 to-rose-900" />
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mb-3 text-2xl font-black tracking-tight text-white md:text-3xl">
            Age Verification Required
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-gray-400 md:text-base">
            Mature stories on this tab are limited to readers {legalAge}+.
            Confirm your age to unlock that catalog.
          </p>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowAgeGate(false)}
              className="flex-1 rounded-xl border border-transparent bg-gray-800 px-4 py-3.5 font-bold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-700 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAdultMode}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-black text-white transition-all active:scale-95",
                palette.primaryBg,
              )}
            >
              <Lock className="h-5 w-5" />
              I am {legalAge} or older
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FigmaSearchOverlay({ searchSuggestions = [] }) {
  const router = useRouter();
  const {
    palette,
    searchOverlayOpen,
    setSearchOverlayOpen,
    isAdultMode,
  } = useFigmaSite();
  const [query, setQuery] = useState("");

  const suggestionItems = useMemo(() => {
    const mapped = buildSearchSuggestionItems(searchSuggestions);
    return mapped.length > 0 ? mapped : DEFAULT_SEARCH_SUGGESTIONS;
  }, [searchSuggestions]);

  useEffect(() => {
    if (!searchOverlayOpen) {
      setQuery("");
    }
  }, [searchOverlayOpen]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const normalizedQuery = query.trim();
    setSearchOverlayOpen(false);
    router.push(
      normalizedQuery
        ? `/search?q=${encodeURIComponent(normalizedQuery)}`
        : "/search",
    );
  };

  if (!searchOverlayOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#050505]/95 backdrop-blur-xl">
      <div className={cn("w-full border-b bg-[#0a0c10]", palette.border)}>
        <form
          onSubmit={handleSearchSubmit}
          className="mx-auto flex h-20 max-w-[1200px] items-center gap-4 px-4 md:h-24 md:px-8"
        >
          <Search className={cn("h-6 w-6 md:h-8 md:w-8", palette.primaryText)} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search comics, novels, authors..."
            className="flex-1 bg-transparent text-xl font-black text-white outline-none placeholder:text-gray-600 md:text-3xl"
          />
          <button
            type="submit"
            className={cn(
              "hidden rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-95 md:block",
              palette.primaryBg,
            )}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setSearchOverlayOpen(false)}
            className="rounded-full bg-white/5 p-3 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-6 w-6 md:h-8 md:w-8" />
          </button>
        </form>
      </div>

      <div className="mx-auto w-full max-w-[1200px] flex-1 overflow-y-auto p-4 md:p-12">
        <h3 className="mb-6 text-sm font-bold uppercase tracking-[0.22em] text-gray-500">
          Trending Searches
        </h3>
        <div className="mb-10 flex flex-wrap gap-3">
          {DEFAULT_TRENDING_TAGS.map((tag) => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              onClick={() => setSearchOverlayOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-gray-300 transition-all hover:scale-105 hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              {tag}
            </Link>
          ))}
        </div>

        <h3 className="mb-6 text-sm font-bold uppercase tracking-[0.22em] text-gray-500">
          Suggested Results
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suggestionItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setSearchOverlayOpen(false)}
              className="group flex items-center gap-4 rounded-2xl border border-transparent bg-white/5 p-4 transition-all hover:border-gray-700 hover:bg-white/10 active:scale-95"
            >
              {item.coverUrl ? (
                <div className="h-12 w-12 overflow-hidden rounded-lg bg-black shadow-inner ring-1 ring-white/10">
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black shadow-inner">
                  <Search className="h-5 w-5 text-gray-500 transition-colors group-hover:text-white" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-white transition-colors group-hover:text-gray-200">
                  {item.title}
                </h4>
                <p className="mt-0.5 flex gap-2 text-xs font-medium text-gray-500">
                  <span className={cn("font-bold", palette.primaryText)}>
                    {item.label}
                  </span>
                  <span>{item.subtitle || (isAdultMode ? "Mature picks live" : "Fresh update")}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function FigmaHeaderInner() {
  const {
    palette,
    isAdultMode,
    legalAge,
    contentType,
    setContentType,
    handleAdultToggle,
    openLogin,
    setSearchOverlayOpen,
    isSignedIn,
    user,
  } = useFigmaSite();
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, loadNotifications } = useNotificationsStore();
  const { paidPts, bonusPts, loadWallet } = useWalletStore();

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    void loadNotifications(isAdultMode ? "1" : "0");
    void loadWallet();
  }, [isAdultMode, isSignedIn, loadNotifications, loadWallet]);

  const notificationCards = useMemo(
    () => buildNotificationCards(notifications),
    [notifications],
  );

  const currentUser = useMemo(
    () => ({
      name: String(user?.email || user?.name || "Reader").split("@")[0],
      wallet: formatWalletTotal({ paidPts, bonusPts }),
      avatar: buildAvatarUrl(
        String(user?.email || user?.name || "Reader").split("@")[0],
        user,
      ),
    }),
    [bonusPts, paidPts, user],
  );

  return (
    <nav
      data-site-header="1"
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-[#0a0c10]/90 backdrop-blur-xl",
        palette.border,
      )}
    >
      <div className="mx-auto max-w-[1600px] px-4 md:px-8">
        <div className="flex h-16 items-center justify-between gap-4 md:h-20">
          <div className="flex items-center">
            <Link
              href="/"
              className="group flex items-center gap-2 transition-transform active:scale-95"
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-lg transition-all group-hover:rotate-12",
                  isAdultMode ? "from-red-600 via-rose-800 to-black" : "from-indigo-500 via-purple-800 to-black",
                )}
              >
                <Flame className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tight text-white md:text-2xl">
                {siteConfig.siteName.toUpperCase()}
                <span className={cn("ml-1", palette.primaryText)}>READS</span>
              </span>
            </Link>
          </div>

          <div className="flex flex-1 justify-center overflow-x-auto">
            <div className="flex shrink-0 rounded-[1rem] border border-white/5 bg-black/40 p-1.5 shadow-inner">
              {FIGMA_CONTENT_OPTIONS.map((option) => {
                const active = contentType === option.key;
                const icon =
                  option.key === FIGMA_CONTENT_TYPES.NOVELS
                    ? BookOpen
                    : option.key === FIGMA_CONTENT_TYPES.INTERACTIVE
                      ? Gamepad2
                      : Sparkles;
                const Icon = icon;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setContentType(option.key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-all md:px-5 md:text-xs",
                      active
                        ? cn(palette.primaryBg, "text-white shadow-lg")
                        : "text-gray-500 hover:bg-white/5 hover:text-gray-300",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <button
              type="button"
              onClick={() => setSearchOverlayOpen(true)}
              className="hidden text-gray-400 transition-colors hover:text-white md:block"
            >
              <Search className="h-6 w-6" />
            </button>

            {isSignedIn ? (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setShowNotifications((value) => !value)}
                  className="relative text-gray-400 transition-colors hover:text-white"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#0a0c10] bg-red-500 px-1 text-[10px] font-black text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>

                {showNotifications ? (
                  <div
                    className={cn(
                      "absolute right-0 top-full z-50 mt-4 w-80 overflow-hidden rounded-2xl border shadow-2xl md:w-96",
                      palette.surface,
                      palette.border,
                    )}
                  >
                    <div className="flex items-center justify-between border-b border-white/5 p-4">
                      <h3 className="font-bold text-white">Notifications</h3>
                      <span className="rounded-md bg-indigo-400/10 px-2 py-1 text-xs font-bold text-indigo-400">
                        {unreadCount} Unread
                      </span>
                    </div>
                    <div className="max-h-[380px] overflow-y-auto">
                      {notificationCards.length > 0 ? (
                        notificationCards.map((item) => (
                          <Link
                            key={item.id}
                            href="/notifications"
                            onClick={() => setShowNotifications(false)}
                            className="flex gap-3 border-b border-white/5 p-4 transition-colors hover:bg-white/5"
                          >
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                                item.kind === "PROMO" || item.kind === "SUB_VOUCHER"
                                  ? "bg-yellow-500/20 text-yellow-500"
                                  : item.kind === "TTF_READY"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-indigo-500/20 text-indigo-400",
                              )}
                            >
                              {item.kind === "PROMO" || item.kind === "SUB_VOUCHER" ? (
                                <Gift className="h-5 w-5" />
                              ) : item.kind === "TTF_READY" ? (
                                <Crown className="h-5 w-5" />
                              ) : (
                                <Bell className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <p className="mb-1 text-sm font-medium text-white">
                                {item.title}
                              </p>
                              <p className="text-xs text-gray-500">{item.body}</p>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="p-4 text-sm text-gray-500">
                          No live notifications yet.
                        </div>
                      )}
                    </div>
                    <div className="bg-black/20 p-3 text-center">
                      <Link
                        href="/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs font-bold text-gray-400 transition-colors hover:text-white"
                      >
                        Open inbox
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <Link
              href="/store"
              className="group relative hidden items-center gap-2 overflow-hidden rounded-full border border-yellow-500/50 bg-yellow-500/10 px-4 py-1.5 text-xs font-black tracking-[0.2em] text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all hover:bg-yellow-500/20 hover:shadow-[0_0_25px_rgba(234,179,8,0.4)] active:scale-95 lg:flex"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
              <Crown className="h-4 w-4" />
              VIP
            </Link>

            <button
              type="button"
              onClick={handleAdultToggle}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all md:px-4 md:py-2",
                isAdultMode
                  ? "border-red-500 bg-red-500/10 text-red-500"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-white",
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide md:text-sm">
                {isAdultMode ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <ShieldAlert className="h-4 w-4" />
                )}
                {isAdultMode ? `${legalAge}+ ON` : `${legalAge}+ OFF`}
              </span>
            </button>

            <div className="hidden h-6 w-px bg-gray-800 md:block" />

            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <div className="hidden flex-col items-end md:flex">
                  <Link
                    href="/account"
                    className="text-sm font-bold text-white transition-colors hover:text-gray-300"
                  >
                    {currentUser.name}
                  </Link>
                  <div className="flex items-center gap-1 text-xs font-semibold text-yellow-500">
                    <Coins className="h-3 w-3" />
                    {currentUser.wallet.toLocaleString()}
                  </div>
                </div>
                <Link href="/account" className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="h-10 w-10 rounded-full border-2 border-transparent object-cover transition-colors hover:border-gray-400"
                  />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0a0c10] bg-green-500" />
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openLogin("login")}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-bold text-white transition-all active:scale-95",
                  palette.primaryBg,
                )}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function FigmaHeader() {
  return (
    <WalletProvider>
      <FigmaHeaderInner />
    </WalletProvider>
  );
}

function FigmaFooter() {
  const { palette } = useFigmaSite();
  return (
    <footer className="border-t border-gray-800 bg-[#06080a] pt-16 pb-8">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Flame className={cn("h-6 w-6", palette.primaryText)} />
              <span className="text-2xl font-black tracking-tight text-white">
                {siteConfig.siteName.toUpperCase()}
                <span className={cn("ml-1", palette.primaryText)}>READS</span>
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-gray-400">
              Comics, novels, and branching stories in one sharp, binge-friendly
              home.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-bold text-white">Browse</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/search" className="transition-colors hover:text-white">
                  Search
                </Link>
              </li>
              <li>
                <Link href="/rankings" className="transition-colors hover:text-white">
                  Rankings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold text-white">Account</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/account" className="transition-colors hover:text-white">
                  My Library
                </Link>
              </li>
              <li>
                <Link href="/store" className="transition-colors hover:text-white">
                  Buy Points
                </Link>
              </li>
              <li>
                <Link
                  href="/notifications"
                  className="transition-colors hover:text-white"
                >
                  Notifications
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold text-white">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link
                  href="/terms-of-service"
                  className="transition-colors hover:text-white"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="transition-colors hover:text-white"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/support" className="transition-colors hover:text-white">
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 md:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {siteConfig.companyName}. All rights
            reserved.
          </p>
          <div className="flex gap-6 text-sm font-bold text-gray-500">
            <span>Twitter / X</span>
            <span>Instagram</span>
            <span>Discord</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function FigmaChrome({
  children,
  hideNav = false,
  hideFooter = false,
  searchSuggestions = [],
}) {
  return (
    <>
      {!hideNav ? <FigmaHeader /> : null}
      <FigmaAgeGateModal />
      <FigmaSearchOverlay searchSuggestions={searchSuggestions} />
      {children}
      {!hideFooter ? <FigmaFooter /> : null}
    </>
  );
}
