"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  CheckCircle2,
  Clock,
  Coins,
  Crown,
  KeyRound,
  LogOut,
  ShieldCheck,
  Settings,
} from "lucide-react";
import {
  getFallbackImageUrl,
  resolveDisplayImageUrl,
} from "../../lib/fallbackImage";
import { useWalletStore } from "../../store/useWalletStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useHistoryStore } from "../../store/useHistoryStore";
import { useBookmarkStore } from "../../store/useBookmarkStore";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import FigmaChrome from "./FigmaChrome";
import {
  FIGMA_CONTENT_TYPES,
  buildBookmarksView,
  buildFigmaCatalog,
  buildProfileHistoryItems,
  cn,
  formatWalletTotal,
} from "./figma-utils";
import { filterContentByMode } from "../../lib/contentFilters";
import { storefrontSoftCardClass } from "../common/StorefrontPagePrimitives";

function AccountContent({ seriesList = [] }) {
  const router = useRouter();
  const { palette, contentMode, isAdultMode } = useFigmaSite();
  const { paidPts, bonusPts, loadWallet } = useWalletStore();
  const { user, isSignedIn, signOut } = useAuthStore();
  const { items: historyItems, loadHistory } = useHistoryStore();
  const { bookmarksBySeries } = useBookmarkStore();
  const [activeTab, setActiveTab] = useState("history");

  const catalog = useMemo(() => buildFigmaCatalog(seriesList), [seriesList]);
  const catalogItems = useMemo(
    () => filterContentByMode(catalog.items, contentMode),
    [catalog.items, contentMode],
  );
  const history = useMemo(
    () => buildProfileHistoryItems(historyItems, catalogItems),
    [catalogItems, historyItems],
  );
  const bookmarks = useMemo(
    () => buildBookmarksView(bookmarksBySeries, catalogItems),
    [bookmarksBySeries, catalogItems],
  );
  const walletTotal = formatWalletTotal({ paidPts, bonusPts });
  const displayName = String(user?.email || user?.name || "Reader").split(
    "@",
  )[0];
  const memberCode = String(walletTotal || 84920).padStart(5, "0");

  if (!isSignedIn) {
    return (
      <div className={cn("min-h-screen pb-20", palette.rootBg)}>
        <FigmaChrome>
          <div className="mx-auto max-w-5xl px-4 md:px-8">
            <section
              className={cn(
                "overflow-hidden rounded-[28px] border p-5 shadow-2xl md:rounded-[32px] md:p-10",
                palette.surface,
                palette.border,
              )}
            >
              <div
                className={cn(
                  "mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.22em]",
                  palette.primarySoft,
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Account
              </div>
              <h1 className="max-w-2xl text-3xl font-black tracking-tight text-white md:text-5xl">
                This device, for now.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-300 md:mt-4 md:max-w-2xl md:text-base md:leading-7">
                Sign in to sync your library, wallet balance, and reading
                progress across every screen you use.
              </p>
              <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap md:mt-8 md:gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/login?returnTo=/account")}
                  className={cn(
                    "inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98] sm:w-auto md:min-h-[50px] md:rounded-2xl md:px-6 md:py-3.5",
                    palette.primaryBg,
                  )}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/auth/reset")}
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:w-auto md:min-h-[50px] md:rounded-2xl md:px-6 md:py-3.5"
                >
                  <KeyRound className="h-4 w-4" />
                  Reset password
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/subscribe")}
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:w-auto md:min-h-[50px] md:rounded-2xl md:px-6 md:py-3.5"
                >
                  <Crown className="h-4 w-4" />
                  Plans
                </button>
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:mt-8 md:grid-cols-3 md:gap-6">
              {[
                {
                  title: "Sync your shelf",
                  body: "Keep bookmarks and recent chapters attached to your account instead of this browser only.",
                },
                {
                  title: "Track wallet activity",
                  body: "See top-ups, bonus points, and membership perks in one place after you sign in.",
                },
                {
                  title: "Jump back in faster",
                  body: "Pick up your last chapter without rebuilding your history every time you switch devices.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className={cn(
                    "rounded-[24px] border p-5 shadow-xl md:rounded-[28px] md:p-6",
                    palette.surface,
                    palette.border,
                  )}
                >
                  <h2 className="text-lg font-black text-white md:text-xl">
                    {item.title}
                  </h2>
                  <p className="mt-2.5 text-sm leading-6 text-gray-400 md:mt-3 md:leading-7">
                    {item.body}
                  </p>
                </div>
              ))}
            </section>
          </div>
        </FigmaChrome>
      </div>
    );
  }

  useEffect(() => {
    void loadWallet();
    void loadHistory();
  }, [loadHistory, loadWallet]);

  return (
    <div className={cn("min-h-screen pb-20", palette.rootBg)}>
      <FigmaChrome>
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div
              className={cn(
                "relative col-span-1 flex flex-col gap-6 overflow-hidden rounded-3xl border p-5 shadow-xl sm:flex-row sm:items-start md:gap-8 md:p-8 lg:col-span-2",
                palette.surface,
                palette.border,
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[100px] opacity-20",
                  isAdultMode ? "bg-red-500" : "bg-indigo-500",
                )}
              />
              <div className="relative shrink-0">
                <div className="relative z-10 h-28 w-28 overflow-hidden rounded-2xl ring-4 ring-black shadow-2xl md:h-32 md:w-32">
                  <img
                    src={getFallbackImageUrl({
                      kind: "avatar",
                      variant: "reader",
                    })}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div
                  className={cn(
                    "absolute -bottom-3 -right-3 z-20 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg",
                    isAdultMode
                      ? "bg-red-600 text-white"
                      : "bg-yellow-500 text-black",
                  )}
                >
                  <Crown className="h-5 w-5 fill-current" />
                </div>
              </div>

              <div className="z-10 flex-1 text-center sm:text-left">
                <div
                  className={cn(
                    "mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] md:px-4 md:py-2 md:text-xs",
                    palette.primarySoft,
                  )}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Reader ID
                </div>
                <div className="mb-2 flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
                  <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                    {displayName}
                  </h1>
                  <div className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.18em] text-gray-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    Verified
                  </div>
                </div>
                <p className="mb-5 text-sm font-medium text-gray-400 md:mb-6">
                  Joined December 2024 | Member #{memberCode}
                </p>

                <div className="mb-5 grid gap-3 sm:grid-cols-3 md:mb-6">
                  <div className={`${storefrontSoftCardClass} px-4 py-3`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">
                      Verified reader
                    </p>
                  </div>
                  <div className={`${storefrontSoftCardClass} px-4 py-3`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                      Wallet
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">
                      {walletTotal.toLocaleString()} coins
                    </p>
                  </div>
                  <div className={`${storefrontSoftCardClass} px-4 py-3`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                      Sync
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">
                      Shelf synced
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-95"
                  >
                    <Settings className="h-4 w-4" />
                    Edit Profile / Settings
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      router.push("/");
                    }}
                    className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-2.5 text-sm font-bold text-red-500 transition-all hover:bg-red-500/20 active:scale-95"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 shadow-xl md:p-6",
                palette.surface,
                palette.border,
              )}
            >
              <div className="absolute right-0 top-0 p-6 opacity-10">
                <Coins className="h-24 w-24" />
              </div>
              <div className="z-10 mb-6">
                <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
                  My Wallet
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black tracking-tight text-white">
                    {walletTotal.toLocaleString()}
                  </span>
                  <span className="mb-1 font-bold text-yellow-500">Coins</span>
                </div>
                <p className="mt-3 text-sm text-gray-500">
                  Paid {paidPts.toLocaleString()} | Bonus{" "}
                  {bonusPts.toLocaleString()}
                </p>
                <div className={`mt-4 ${storefrontSoftCardClass} px-4 py-3`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                    Account lane
                  </p>
                  <p className="mt-2 text-sm leading-5 text-gray-400">
                    Use the wallet for chapter unlocks, then manage plans and
                    settings from the same account area.
                  </p>
                </div>
              </div>
              <div className="z-10">
                <Link
                  href="/store"
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black uppercase tracking-[0.18em] transition-transform active:scale-[0.98]",
                    isAdultMode
                      ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:bg-red-500"
                      : "bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:bg-yellow-400",
                  )}
                >
                  Top Up Balance
                </Link>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "min-h-[360px] overflow-hidden rounded-3xl border shadow-xl md:min-h-[420px]",
              palette.surface,
              palette.border,
            )}
          >
            <div className="flex border-b border-white/10 px-4 md:px-8">
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-4 text-xs font-bold uppercase tracking-[0.18em] transition-colors md:px-4 md:py-6 md:text-sm",
                  activeTab === "history"
                    ? isAdultMode
                      ? "border-red-500 text-red-500"
                      : "border-indigo-500 text-indigo-400"
                    : "border-transparent text-gray-500 hover:text-gray-300",
                )}
              >
                <Clock className="h-4 w-4" />
                Reading History
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bookmarks")}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-4 text-xs font-bold uppercase tracking-[0.18em] transition-colors md:px-4 md:py-6 md:text-sm",
                  activeTab === "bookmarks"
                    ? isAdultMode
                      ? "border-red-500 text-red-500"
                      : "border-indigo-500 text-indigo-400"
                    : "border-transparent text-gray-500 hover:text-gray-300",
                )}
              >
                <Bookmark className="h-4 w-4" />
                Saved Series
              </button>
            </div>

            <div className="p-4 md:p-8">
              {activeTab === "history" ? (
                history.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {history.map((item) => (
                      <Link
                        key={item.id}
                        href={item.readHref}
                        className="group flex gap-4 rounded-2xl border border-transparent bg-white/5 p-3 transition-all hover:border-white/10 hover:bg-white/10"
                      >
                        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl">
                          <img
                            src={resolveDisplayImageUrl(item.coverUrl, {
                              kind: "cover",
                              adult: item?.adult || item?.isAdult,
                            })}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          {item.progress >= 100 ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <CheckCircle2 className="h-6 w-6 text-green-500" />
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-1 flex-col justify-center py-1">
                          <h3 className="mb-1 line-clamp-1 text-base font-bold text-white">
                            {item.title}
                          </h3>
                          <p className="mb-3 text-xs font-medium text-gray-400">
                            {item.chapter}
                          </p>
                          <div className="mt-auto">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  isAdultMode ? "bg-red-500" : "bg-indigo-500",
                                )}
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <p className="mt-1.5 text-right text-[10px] font-bold text-gray-500">
                              {item.progress}%
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center md:py-20">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                      <Clock className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-white">
                      No reading history yet
                    </h3>
                    <p className="max-w-sm text-gray-400">
                      Once you start reading, your progress will show up here.
                    </p>
                  </div>
                )
              ) : bookmarks.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {bookmarks.map((item) => (
                    <Link
                      key={item.id}
                      href={item.readHref}
                      className="group flex gap-4 rounded-2xl border border-transparent bg-white/5 p-3 transition-all hover:border-white/10 hover:bg-white/10"
                    >
                      <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl">
                        <img
                          src={resolveDisplayImageUrl(item.coverUrl, {
                            kind: "cover",
                            adult: item?.adult || item?.isAdult,
                          })}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-center py-1">
                        <h3 className="mb-1 line-clamp-1 text-base font-bold text-white">
                          {item.title}
                        </h3>
                        <p className="min-h-[2rem] text-xs font-medium text-gray-400">
                          {item.chapter}
                        </p>
                        <span className="mt-auto pt-4 text-sm font-bold text-white/75">
                          Continue Reading
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center md:py-20">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                    <Bookmark className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-white">
                    No Bookmarks Yet
                  </h3>
                  <p className="mb-6 max-w-sm text-gray-400">
                    Save your favorite titles and they&apos;ll show up here for
                    quick access.
                  </p>
                  <Link
                    href="/"
                    className={cn(
                      "rounded-xl px-6 py-3 text-sm font-bold transition-colors",
                      isAdultMode
                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20",
                    )}
                  >
                    Explore Stories
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </FigmaChrome>
    </div>
  );
}

export default function FigmaAccountPage({ seriesList = [] }) {
  return (
    <FigmaSiteProvider initialContentType={FIGMA_CONTENT_TYPES.COMICS}>
      <AccountContent seriesList={seriesList} />
    </FigmaSiteProvider>
  );
}
