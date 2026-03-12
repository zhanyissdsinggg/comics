"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  Megaphone,
  MessageSquare,
  Radar,
  Receipt,
  Search,
  Settings,
  Users,
} from "lucide-react";

import GlobalSearch from "./GlobalSearch";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: BarChart3, match: ["/admin"], exact: true },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Titles",
        href: "/admin/series",
        icon: BookOpen,
        match: ["/admin/series"],
        children: [
          { label: "Comics", href: "/admin/series?type=comic" },
          { label: "Novels", href: "/admin/series?type=novel" },
        ],
      },
      { label: "Comments", href: "/admin/comments", icon: MessageSquare, match: ["/admin/comments"] },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "Promotions", href: "/admin/promotions", icon: Megaphone, match: ["/admin/promotions"] },
      { label: "Orders", href: "/admin/orders", icon: Receipt, match: ["/admin/orders"] },
      { label: "Billing Packages", href: "/admin/billing", icon: CreditCard, match: ["/admin/billing"] },
      { label: "Notifications", href: "/admin/notifications", icon: Bell, match: ["/admin/notifications"] },
    ],
  },
  {
    label: "Customer Ops",
    items: [
      { label: "Users", href: "/admin/users", icon: Users, match: ["/admin/users"] },
      { label: "Support", href: "/admin/support", icon: LifeBuoy, match: ["/admin/support"] },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Brand Settings", href: "/admin/branding", icon: Image, match: ["/admin/branding"] },
      { label: "Email Settings", href: "/admin/email-settings", icon: Mail, match: ["/admin/email-settings"] },
      { label: "Email Jobs", href: "/admin/email-jobs", icon: MailCheck, match: ["/admin/email-jobs"] },
      { label: "Tracking", href: "/admin/tracking", icon: Radar, match: ["/admin/tracking"] },
      { label: "Regions", href: "/admin/regions", icon: Globe, match: ["/admin/regions"] },
      { label: "System Settings", href: "/admin/settings", icon: Settings, match: ["/admin/settings"] },
    ],
  },
];

const BREADCRUMB_MAP = [
  { match: "/admin", label: "Dashboard", exact: true },
  { match: "/admin/series", label: "Titles" },
  { match: "/admin/promotions", label: "Promotions" },
  { match: "/admin/orders", label: "Orders" },
  { match: "/admin/billing", label: "Billing Packages" },
  { match: "/admin/branding", label: "Brand Settings" },
  { match: "/admin/email-settings", label: "Email Settings" },
  { match: "/admin/email-jobs", label: "Email Jobs" },
  { match: "/admin/regions", label: "Regions" },
  { match: "/admin/support", label: "Support" },
  { match: "/admin/users", label: "Users" },
  { match: "/admin/tracking", label: "Tracking" },
  { match: "/admin/notifications", label: "Notifications" },
  { match: "/admin/comments", label: "Comments" },
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

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(new Set(["/admin/series"]));
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-50 border-r border-ios-gray-800 bg-neutral-900/90 shadow-ios-lg backdrop-blur-2xl transition-all duration-300 lg:relative ${
            isCollapsed ? "w-20" : "w-72"
          } ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-ios-gray-800 px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-4xl bg-gradient-to-br from-ios-green to-emerald-600 shadow-ios shadow-ios-glow transition-transform duration-300 hover:scale-110 active:scale-95">
                <span className="text-xl font-bold text-white">MN</span>
              </div>
              {!isCollapsed ? (
                <div className="animate-fade-in">
                  <h1 className="text-base font-bold text-ios-green">Admin Console</h1>
                  <p className="text-[10px] text-ios-gray-500">Operations workspace</p>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsCollapsed((current) => !current)}
              className="hidden h-9 w-9 items-center justify-center rounded-3xl bg-ios-green/10 text-ios-green transition-all duration-300 hover:bg-ios-green/20 hover:scale-110 hover:shadow-ios-sm active:scale-95 lg:flex"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-ios-gray-700 scrollbar-track-transparent">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="animate-fade-in">
                {!isCollapsed ? (
                  <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-ios-green/60">
                    {group.label}
                  </div>
                ) : null}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : item.match?.some((prefix) => pathname.startsWith(prefix));
                    const Icon = item.icon;
                    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                    const isExpanded = expandedMenus.has(item.href);

                    return (
                      <div key={item.label}>
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleMenu(item.href)}
                            className={`group flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                              isActive
                                ? "bg-ios-green/20 text-ios-green shadow-ios-sm"
                                : "text-ios-gray-400 hover:bg-ios-green/10 hover:text-ios-green hover:scale-[1.02] active:scale-95"
                            }`}
                            title={isCollapsed ? item.label : undefined}
                          >
                            <Icon size={20} className={`flex-shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 group-hover:rotate-12"}`} />
                            {!isCollapsed ? <span className="flex-1 truncate text-left">{item.label}</span> : null}
                            {!isCollapsed ? (
                              <ChevronDown size={16} className={`flex-shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                            ) : null}
                          </button>
                        ) : (
                          <Link
                            href={item.href}
                            className={`group flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                              isActive
                                ? "bg-ios-green/20 text-ios-green shadow-ios-sm"
                                : "text-ios-gray-400 hover:bg-ios-green/10 hover:text-ios-green hover:scale-[1.02] active:scale-95"
                            }`}
                            title={isCollapsed ? item.label : undefined}
                          >
                            <Icon size={20} className={`flex-shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 group-hover:rotate-12"}`} />
                            {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
                            {isActive && !isCollapsed ? <div className="ml-auto h-2 w-2 rounded-full bg-ios-green animate-pulse shadow-ios-glow" /> : null}
                          </Link>
                        )}

                        {hasChildren && isExpanded && !isCollapsed ? (
                          <div className="mt-1 ml-6 space-y-1 border-l-2 border-ios-green/20 pl-3 animate-slide-in-right">
                            {item.children.map((child) => {
                              const childIsActive = isChildLinkActive(pathname, searchParams, child.href);

                              return (
                                <Link
                                  key={child.label}
                                  href={child.href}
                                  className={`group flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium transition-all duration-300 ${
                                    childIsActive
                                      ? "bg-ios-green/20 text-ios-green"
                                      : "text-ios-gray-400 hover:bg-ios-green/10 hover:text-ios-green hover:scale-[1.02] active:scale-95"
                                  }`}
                                >
                                  <span className="truncate">{child.label}</span>
                                  {childIsActive ? <div className="ml-auto h-1.5 w-1.5 rounded-full bg-ios-green animate-pulse" /> : null}
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
            <div className="border-t border-ios-gray-800 p-4 animate-fade-in">
              <div className="flex items-center gap-3 rounded-4xl bg-ios-green/10 px-4 py-3 shadow-ios-sm transition-all duration-300 hover:bg-ios-green/15 hover:scale-[1.02] active:scale-95">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-ios-green to-emerald-600 text-sm font-bold text-white shadow-ios">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-200">Admin</p>
                  <p className="truncate text-[10px] text-ios-gray-500">Administrator</p>
                </div>
              </div>
            </div>
          ) : null}
        </aside>

        {isMobileMenuOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-ios-gray-800 bg-neutral-900/80 shadow-ios backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((current) => !current)}
                  className="flex h-11 w-11 items-center justify-center rounded-3xl bg-ios-green/10 text-ios-green transition-all duration-300 hover:bg-ios-green/20 hover:scale-110 hover:shadow-ios-sm active:scale-95 lg:hidden"
                  aria-label="Open mobile menu"
                >
                  <ChevronRight size={22} />
                </button>
                <div className="animate-fade-in">
                  <p className="text-xs font-medium text-ios-green/60">{breadcrumb}</p>
                  <h1 className="text-2xl font-bold text-neutral-100">{title}</h1>
                  {subtitle ? <p className="mt-0.5 text-xs text-ios-gray-500">{subtitle}</p> : null}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="hidden items-center gap-2 rounded-4xl border border-ios-green/20 bg-ios-green/5 px-5 py-2.5 text-xs text-ios-green transition-all duration-300 hover:border-ios-green/30 hover:bg-ios-green/10 hover:scale-105 hover:shadow-ios-sm active:scale-95 md:flex"
                >
                  <Search size={16} />
                  <span>Search</span>
                  <kbd className="rounded-2xl border border-ios-green/20 bg-ios-green/10 px-2 py-1 text-[10px] font-medium shadow-ios-sm">
                    Ctrl+K
                  </kbd>
                </button>
                {actions ? <div className="flex items-center gap-2 animate-fade-in">{actions}</div> : null}
              </div>
            </div>
          </header>

          <main className="flex-1 bg-neutral-950 p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
