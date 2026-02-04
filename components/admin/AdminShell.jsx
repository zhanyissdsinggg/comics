"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  Megaphone,
  Settings,
  BookOpen,
  Bell,
  MessageSquare,
  Receipt,
  Users,
  Radar,
  LifeBuoy,
  CreditCard,
  Image,
  Mail,
  MailCheck,
  Globe,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "首页", href: "/admin", icon: Home, match: ["/admin"] },
  { label: "作品管理", href: "/admin/series", icon: BookOpen, match: ["/admin/series"] },
  { label: "活动配置", href: "/admin/promotions", icon: Megaphone, match: ["/admin/promotions"] },
  { label: "订单管理", href: "/admin/orders", icon: Receipt, match: ["/admin/orders"] },
  { label: "套餐定价", href: "/admin/billing", icon: CreditCard, match: ["/admin/billing"] },
  { label: "图片管理", href: "/admin/branding", icon: Image, match: ["/admin/branding"] },
  { label: "邮件设置", href: "/admin/email-settings", icon: Mail, match: ["/admin/email-settings"] },
  { label: "邮件记录", href: "/admin/email-jobs", icon: MailCheck, match: ["/admin/email-jobs"] },
  { label: "支持工单", href: "/admin/support", icon: LifeBuoy, match: ["/admin/support"] },
  { label: "用户管理", href: "/admin/users", icon: Users, match: ["/admin/users"] },
  { label: "追踪设置", href: "/admin/tracking", icon: Radar, match: ["/admin/tracking"] },
  { label: "通知中心", href: "/admin/notifications", icon: Bell, match: ["/admin/notifications"] },
  { label: "评论管理", href: "/admin/comments", icon: MessageSquare, match: ["/admin/comments"] },
  { label: "系统设置", href: "/admin", icon: Settings, match: ["/admin/settings"] },
];

const SYSTEM_ITEMS = [
  { label: "区号配置", href: "/admin/regions", icon: Globe, match: ["/admin/regions"] },
];

function buildHref(href, key) {
  if (!key) {
    return href;
  }
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}key=${key}`;
}

const BREADCRUMB_MAP = [
  { match: "/admin/series", label: "作品管理" },
  { match: "/admin/promotions", label: "活动配置" },
  { match: "/admin/orders", label: "订单管理" },
  { match: "/admin/billing", label: "套餐定价" },
  { match: "/admin/branding", label: "图片管理" },
  { match: "/admin/email-settings", label: "邮件设置" },
  { match: "/admin/email-jobs", label: "邮件记录" },
  { match: "/admin/regions", label: "区号配置" },
  { match: "/admin/support", label: "支持工单" },
  { match: "/admin/users", label: "用户管理" },
  { match: "/admin/tracking", label: "追踪设置" },
  { match: "/admin/notifications", label: "通知中心" },
  { match: "/admin/comments", label: "评论管理" },
  { match: "/admin/settings", label: "系统设置" },
];

function getBreadcrumb(pathname) {
  if (pathname === "/admin") {
    return ["首页"];
  }
  const hit = BREADCRUMB_MAP.find((item) => pathname.startsWith(item.match));
  return ["首页", hit ? hit.label : "管理"];
}

export default function AdminShell({ title, subtitle, children, actions }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const breadcrumb = getBreadcrumb(pathname);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-60 bg-slate-800 text-slate-100">
          <div className="flex items-center gap-2 px-5 py-4 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <span className="text-lg">MN</span>
            </div>
            管理系统
          </div>
          <nav className="mt-4 space-y-1 px-3">
            {NAV_ITEMS.map((item) => {
              const isHome = item.label === "首页";
              const isActive = isHome
                ? pathname === "/admin"
                : item.match?.some((prefix) => pathname.startsWith(prefix));
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={buildHref(item.href, key)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    isActive ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              系统设置
            </div>
            {SYSTEM_ITEMS.map((item) => {
              const isActive = item.match?.some((prefix) => pathname.startsWith(prefix));
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={buildHref(item.href, key)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    isActive ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div>
                <p className="text-xs text-slate-500">
                  {breadcrumb.join(" / ")}
                </p>
                <h1 className="text-lg font-semibold">{title}</h1>
                {subtitle ? (
                  <p className="text-xs text-slate-400">{subtitle}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-400 md:flex">
                  <span>⌘K</span>
                  <span>搜索</span>
                </div>
                <input
                  type="search"
                  placeholder="搜索作品/章节"
                  className="hidden w-56 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 md:block"
                />
                {actions ? (
                  <div className="flex items-center gap-2">{actions}</div>
                ) : null}
              </div>
            </div>
          </header>
          <main className="flex-1 px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
