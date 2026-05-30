"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Globe,
  Image,
  LifeBuoy,
  Mail,
  MailCheck,
  Menu,
  Megaphone,
  MessageSquare,
  PenSquare,
  Radar,
  Receipt,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import GlobalSearch from "./GlobalSearch";
import { useAdminAuth } from "./AuthContext";
import { canAccessAdminRoute, getAdminRoleLabel } from "../../lib/adminAccess";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: BarChart3,
        match: ["/admin"],
        exact: true,
      },
      {
        label: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        match: ["/admin/analytics"],
      },
      {
        label: "Series",
        href: "/admin/series",
        icon: BookOpen,
        match: ["/admin/series"],
        children: [
          { label: "All Series", href: "/admin/series" },
          { label: "Comics", href: "/admin/series?type=comic" },
          { label: "Novels", href: "/admin/series?type=novel" },
        ],
      },
      {
        label: "Creators",
        href: "/admin/creators",
        icon: PenSquare,
        match: ["/admin/creators"],
      },
      {
        label: "Interactive Stories",
        href: "/admin/interactive-stories",
        icon: BookOpen,
        match: ["/admin/interactive-stories"],
      },
    ],
  },
  {
    label: "Discovery & Frontend",
    items: [
      {
        label: "Storefront Audit",
        href: "/admin/storefront",
        icon: Search,
        match: ["/admin/storefront"],
      },
      {
        label: "Home Merchandising",
        href: "/admin/merchandising",
        icon: Sparkles,
        match: ["/admin/merchandising"],
      },
      {
        label: "Recommendations",
        href: "/admin/recommendations",
        icon: Sparkles,
        match: ["/admin/recommendations"],
      },
      {
        label: "Comments",
        href: "/admin/comments",
        icon: MessageSquare,
        match: ["/admin/comments"],
      },
    ],
  },
  {
    label: "Users & Support",
    items: [
      {
        label: "Users",
        href: "/admin/users",
        icon: Users,
        match: ["/admin/users"],
      },
      {
        label: "Support",
        href: "/admin/support",
        icon: LifeBuoy,
        match: ["/admin/support"],
      },
      {
        label: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
        match: ["/admin/notifications"],
      },
      {
        label: "Audit Logs",
        href: "/admin/logs",
        icon: ScrollText,
        match: ["/admin/logs"],
      },
    ],
  },
  {
    label: "Commerce & Revenue",
    items: [
      {
        label: "Promotions",
        href: "/admin/promotions",
        icon: Megaphone,
        match: ["/admin/promotions"],
      },
      {
        label: "Marketing",
        href: "/admin/marketing",
        icon: Megaphone,
        match: ["/admin/marketing"],
      },
      {
        label: "Orders",
        href: "/admin/orders",
        icon: Receipt,
        match: ["/admin/orders"],
      },
      {
        label: "Revenue",
        href: "/admin/revenue",
        icon: CreditCard,
        match: ["/admin/revenue"],
      },
      {
        label: "Billing",
        href: "/admin/billing",
        icon: CreditCard,
        match: ["/admin/billing"],
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Brand Assets",
        href: "/admin/branding",
        icon: Image,
        match: ["/admin/branding"],
      },
      {
        label: "Email Settings",
        href: "/admin/email-settings",
        icon: Mail,
        match: ["/admin/email-settings"],
      },
      {
        label: "Email Jobs",
        href: "/admin/email-jobs",
        icon: MailCheck,
        match: ["/admin/email-jobs"],
      },
      {
        label: "Tracking",
        href: "/admin/tracking",
        icon: Radar,
        match: ["/admin/tracking"],
      },
      {
        label: "Admin Members",
        href: "/admin/members",
        icon: ShieldCheck,
        match: ["/admin/members"],
      },
      {
        label: "Regions",
        href: "/admin/regions",
        icon: Globe,
        match: ["/admin/regions"],
      },
      {
        label: "System Settings",
        href: "/admin/settings",
        icon: Settings,
        match: ["/admin/settings"],
      },
    ],
  },
];

const BREADCRUMB_MAP = [
  { match: "/admin", label: "Dashboard", exact: true },
  { match: "/admin/analytics", label: "Analytics" },
  { match: "/admin/series", label: "Series" },
  { match: "/admin/creators", label: "Creators" },
  { match: "/admin/interactive-stories", label: "Interactive Stories" },
  { match: "/admin/storefront", label: "Storefront Audit" },
  { match: "/admin/merchandising", label: "Home Merchandising" },
  { match: "/admin/recommendations", label: "Recommendations" },
  { match: "/admin/comments", label: "Comments" },
  { match: "/admin/promotions", label: "Promotions" },
  { match: "/admin/marketing", label: "Marketing" },
  { match: "/admin/orders", label: "Orders" },
  { match: "/admin/revenue", label: "Revenue" },
  { match: "/admin/billing", label: "Billing" },
  { match: "/admin/notifications", label: "Notifications" },
  { match: "/admin/logs", label: "Audit Logs" },
  { match: "/admin/users", label: "Users" },
  { match: "/admin/support", label: "Support" },
  { match: "/admin/branding", label: "Brand Assets" },
  { match: "/admin/email-settings", label: "Email Settings" },
  { match: "/admin/email-jobs", label: "Email Jobs" },
  { match: "/admin/tracking", label: "Tracking" },
  { match: "/admin/members", label: "Admin Members" },
  { match: "/admin/regions", label: "Regions" },
  { match: "/admin/settings", label: "System Settings" },
];

function getBreadcrumb(pathname) {
  const hit = BREADCRUMB_MAP.find((item) => {
    if (item.exact) {
      return pathname === item.match;
    }
    return pathname.startsWith(item.match);
  });

  return hit ? hit.label : "Admin";
}

function isChildLinkActive(pathname, searchParams, href) {
  const [targetPath, targetQuery = ""] = href.split("?");
  if (pathname !== targetPath) {
    return false;
  }
  if (!targetQuery) {
    return true;
  }
  return searchParams.toString() === targetQuery;
}

export default function AdminShell({ title, subtitle, children, actions }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const breadcrumb = getBreadcrumb(pathname);
  const { adminRole, permissions, routePatterns, homePath, session } =
    useAdminAuth();
  const roleLabel = getAdminRoleLabel(adminRole);
  const effectiveHomePath = homePath || "/admin";

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(
    new Set(["/admin/series"]),
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const visibleNavGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items
          .map((item) => ({
            ...item,
            children: Array.isArray(item.children)
              ? item.children.filter((child) =>
                  canAccessAdminRoute(child.href, routePatterns),
                )
              : item.children,
          }))
          .filter((item) => canAccessAdminRoute(item.href, routePatterns)),
      })).filter((group) => group.items.length > 0),
    [routePatterns],
  );

  const activeGroupLabel = useMemo(() => {
    const group = visibleNavGroups.find((item) =>
      item.items.some((navItem) =>
        navItem.exact
          ? pathname === navItem.href
          : navItem.match?.some((prefix) => pathname.startsWith(prefix)),
      ),
    );
    return group?.label || "Workspace";
  }, [pathname, visibleNavGroups]);

  const toggleMenu = (href) => {
    setExpandedMenus((current) => {
      const next = new Set(current);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="admin-theme relative min-h-screen overflow-hidden bg-[var(--gush-page-bg)] text-[var(--gush-ink-strong)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white" />

      <div className="relative z-[1] flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[color:var(--gush-border)] bg-white/84 shadow-[0_24px_56px_rgba(41,19,67,0.12)] backdrop-blur-2xl transition-all duration-300 lg:relative",
            isCollapsed ? "w-[92px]" : "w-[284px]",
            isMobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-[color:var(--gush-border)] px-4 py-5">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={effectiveHomePath}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,248,0.96))] text-sm font-semibold tracking-[0.18em] text-slate-950 shadow-[0_16px_32px_rgba(255,79,154,0.12)]">
                    GS
                  </div>
                  {!isCollapsed ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Admin
                      </p>
                      <h1 className="mt-1 text-base font-semibold text-slate-950">
                        Gush Control
                      </h1>
                    </div>
                  ) : null}
                </Link>

                <button
                  type="button"
                  onClick={() => setIsCollapsed((current) => !current)}
                  className="hidden h-10 w-10 items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-white/90 text-slate-500 transition hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950 lg:flex"
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isCollapsed ? (
                    <ChevronRight size={18} />
                  ) : (
                    <ChevronLeft size={18} />
                  )}
                </button>
              </div>

              {!isCollapsed ? (
                <div className="mt-4 rounded-[24px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,246,251,0.92))] px-4 py-4 shadow-[0_14px_30px_rgba(41,19,67,0.08)] ring-1 ring-white/70">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Current focus
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {activeGroupLabel}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Navigation is grouped by operating area so the daily queue
                    stays one click away.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="px-4 py-4">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className={cn(
                  "flex h-11 w-full items-center gap-3 rounded-full border border-[color:var(--gush-border)] bg-white/88 px-4 text-left text-sm text-slate-700 shadow-[0_12px_26px_rgba(41,19,67,0.08)] backdrop-blur-sm transition hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950",
                  isCollapsed ? "justify-center px-0" : "",
                )}
              >
                <Search size={17} className="shrink-0 text-slate-500" />
                {!isCollapsed ? (
                  <>
                    <span className="flex-1">Search admin pages</span>
                    <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      Ctrl+K
                    </span>
                  </>
                ) : null}
              </button>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
              {visibleNavGroups.map((group) => (
                <div key={group.label}>
                  {!isCollapsed ? (
                    <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {group.label}
                    </div>
                  ) : null}

                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = item.exact
                        ? pathname === item.href
                        : item.match?.some((prefix) =>
                            pathname.startsWith(prefix),
                          );
                      const Icon = item.icon;
                      const hasChildren =
                        Array.isArray(item.children) &&
                        item.children.length > 0;
                      const isExpanded = expandedMenus.has(item.href);

                      const baseClass =
                        "group flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-sm font-medium transition-all duration-200";
                      const activeClass =
                        "border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,248,0.94))] text-slate-950 shadow-[0_14px_30px_rgba(255,79,154,0.1)]";
                      const idleClass =
                        "border-transparent text-slate-600 hover:border-[color:var(--gush-border)] hover:bg-white/80 hover:text-slate-950";

                      return (
                        <div key={item.label}>
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleMenu(item.href)}
                              className={cn(
                                baseClass,
                                isActive ? activeClass : idleClass,
                              )}
                              title={isCollapsed ? item.label : undefined}
                            >
                              <Icon
                                size={18}
                                className={cn(
                                  "shrink-0",
                                  isActive
                                    ? "text-slate-950"
                                    : "text-slate-400",
                                )}
                              />
                              {!isCollapsed ? (
                                <span className="flex-1 truncate text-left">
                                  {item.label}
                                </span>
                              ) : null}
                              {!isCollapsed ? (
                                <ChevronDown
                                  size={16}
                                  className={cn(
                                    "shrink-0 text-slate-400 transition-transform duration-200",
                                    isExpanded ? "rotate-180" : "",
                                  )}
                                />
                              ) : null}
                            </button>
                          ) : (
                            <Link
                              href={item.href}
                              className={cn(
                                baseClass,
                                isActive ? activeClass : idleClass,
                              )}
                              title={isCollapsed ? item.label : undefined}
                            >
                              <Icon
                                size={18}
                                className={cn(
                                  "shrink-0",
                                  isActive
                                    ? "text-slate-950"
                                    : "text-slate-400",
                                )}
                              />
                              {!isCollapsed ? (
                                <span className="truncate">{item.label}</span>
                              ) : null}
                              {isActive && !isCollapsed ? (
                                <span className="ml-auto h-2 w-2 rounded-full bg-[color:var(--gush-accent)] shadow-[0_0_0_4px_rgba(255,79,154,0.16)]" />
                              ) : null}
                            </Link>
                          )}

                          {hasChildren && isExpanded && !isCollapsed ? (
                            <div className="mt-1 ml-6 space-y-1 border-l border-[color:var(--gush-border)] pl-3">
                              {item.children.map((child) => {
                                const childIsActive = isChildLinkActive(
                                  pathname,
                                  searchParams,
                                  child.href,
                                );

                                return (
                                  <Link
                                    key={child.label}
                                    href={child.href}
                                    className={cn(
                                      "group flex items-center gap-2 rounded-[16px] px-3 py-2 text-xs font-medium transition-all duration-200",
                                      childIsActive
                                        ? "bg-white text-slate-950 shadow-[0_10px_20px_rgba(41,19,67,0.08)]"
                                        : "text-slate-500 hover:bg-white/72 hover:text-slate-950",
                                    )}
                                  >
                                    <span className="truncate">
                                      {child.label}
                                    </span>
                                    {childIsActive ? (
                                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[color:var(--gush-accent)] shadow-[0_0_0_4px_rgba(255,79,154,0.16)]" />
                                    ) : null}
                                  </Link>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {!isCollapsed ? (
              <div className="border-t border-[color:var(--gush-border)] p-4">
                <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,249,255,0.92))] px-4 py-4 shadow-[0_14px_30px_rgba(41,19,67,0.08)] ring-1 ring-white/70">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Current session
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {session?.adminName || roleLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {session?.adminEmail || roleLabel}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1">
                      {visibleNavGroups.length} groups
                    </span>
                    <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1">
                      {permissions.length} permissions
                    </span>
                    {session?.keySlot ? (
                      <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1">
                        Key slot {session.keySlot}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        {isMobileMenuOpen ? (
          <div
            className="fixed inset-0 z-40 bg-[rgba(18,12,28,0.28)] backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[color:var(--gush-border)] bg-white/78 shadow-[0_18px_40px_rgba(41,19,67,0.08)] backdrop-blur-2xl">
            <div className="mx-auto flex w-[min(var(--gush-page-max-wide),calc(100%-2rem))] flex-col gap-4 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((current) => !current)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-white/90 text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950 lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </button>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {breadcrumb}
                  </p>
                  <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-950 sm:text-[2.1rem]">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px] sm:leading-7">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center justify-end gap-2 xl:w-auto xl:max-w-[48rem]">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="hidden h-11 items-center gap-2 rounded-full border border-[color:var(--gush-border)] bg-white/88 px-4 text-sm font-medium text-slate-700 shadow-[0_12px_26px_rgba(41,19,67,0.08)] backdrop-blur-sm transition hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950 md:flex"
                >
                  <Search size={16} className="text-slate-500" />
                  <span>Search</span>
                  <kbd className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Ctrl+K
                  </kbd>
                </button>
                {actions ? (
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 xl:w-auto">
                    {actions}
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-[min(var(--gush-page-max-wide),calc(100%-2rem))] py-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        routePatterns={routePatterns}
        homePath={effectiveHomePath}
      />
    </div>
  );
}
