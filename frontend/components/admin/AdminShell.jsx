"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import GlobalSearch from "./GlobalSearch";
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  BarChart3,
} from "lucide-react";

/**
 * 老王重新设计：现代化的后台管理面板
 * 特点：
 * - 功能分组清晰
 * - emerald绿色主题
 * - 可折叠侧边栏
 * - 响应式设计
 * - iOS风格大圆角
 */

// 老王重新设计：按功能分组的导航项，支持子菜单
const NAV_GROUPS = [
  {
    label: "概览",
    items: [
      { label: "数据看板", href: "/admin", icon: BarChart3, match: ["/admin"], exact: true },
    ],
  },
  {
    label: "内容管理",
    items: [
      {
        label: "作品管理",
        href: "/admin/series",
        icon: BookOpen,
        match: ["/admin/series"],
        children: [
          { label: "漫画管理", href: "/admin/series?type=comic" },
          { label: "小说管理", href: "/admin/series?type=novel" },
        ]
      },
      { label: "评论管理", href: "/admin/comments", icon: MessageSquare, match: ["/admin/comments"] },
    ],
  },
  {
    label: "运营管理",
    items: [
      { label: "活动配置", href: "/admin/promotions", icon: Megaphone, match: ["/admin/promotions"] },
      { label: "订单管理", href: "/admin/orders", icon: Receipt, match: ["/admin/orders"] },
      { label: "套餐定价", href: "/admin/billing", icon: CreditCard, match: ["/admin/billing"] },
      { label: "通知中心", href: "/admin/notifications", icon: Bell, match: ["/admin/notifications"] },
    ],
  },
  {
    label: "用户服务",
    items: [
      { label: "用户管理", href: "/admin/users", icon: Users, match: ["/admin/users"] },
      { label: "支持工单", href: "/admin/support", icon: LifeBuoy, match: ["/admin/support"] },
    ],
  },
  {
    label: "系统设置",
    items: [
      { label: "图片管理", href: "/admin/branding", icon: Image, match: ["/admin/branding"] },
      { label: "邮件设置", href: "/admin/email-settings", icon: Mail, match: ["/admin/email-settings"] },
      { label: "邮件记录", href: "/admin/email-jobs", icon: MailCheck, match: ["/admin/email-jobs"] },
      { label: "追踪设置", href: "/admin/tracking", icon: Radar, match: ["/admin/tracking"] },
      { label: "区号配置", href: "/admin/regions", icon: Globe, match: ["/admin/regions"] },
      { label: "系统设置", href: "/admin/settings", icon: Settings, match: ["/admin/settings"] },
    ],
  },
];

// 老王注释：面包屑映射
const BREADCRUMB_MAP = [
  { match: "/admin", label: "数据看板", exact: true },
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
  const hit = BREADCRUMB_MAP.find((item) => {
    if (item.exact) {
      return pathname === item.match;
    }
    return pathname.startsWith(item.match);
  });
  return hit ? hit.label : "管理";
}

export default function AdminShell({ title, subtitle, children, actions }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const breadcrumb = getBreadcrumb(pathname);

  // 老王添加：侧边栏折叠状态
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // 老王添加：子菜单展开状态（记录哪些父菜单是展开的）
  const [expandedMenus, setExpandedMenus] = useState(new Set(["/admin/series"])); // 默认展开作品管理
  // 老王添加：全局搜索状态
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 老王添加：切换子菜单展开状态
  const toggleMenu = (href) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(href)) {
        newSet.delete(href);
      } else {
        newSet.add(href);
      }
      return newSet;
    });
  };

  // 老王添加：响应式处理
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

  // 老王添加：全局快捷键支持
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ⌘K / Ctrl+K 打开搜索
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="flex min-h-screen">
        {/* 老王iOS 26风格优化：侧边栏 - 毛玻璃 + 动画 + 阴影 */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-neutral-900/90 backdrop-blur-2xl border-r border-ios-gray-800 shadow-ios-lg transition-all duration-300 lg:relative animate-scale-in ${
            isCollapsed ? "w-20" : "w-72"
          } ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          {/* 老王iOS 26优化：Logo和标题 - 更大的圆角和阴影 */}
          <div className="flex items-center justify-between gap-3 px-5 py-6 border-b border-ios-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-4xl bg-gradient-to-br from-ios-green to-emerald-600 shadow-ios shadow-ios-glow transition-transform duration-300 hover:scale-110 active:scale-95">
                <span className="text-xl font-bold text-white">MN</span>
              </div>
              {!isCollapsed && (
                <div className="animate-fade-in">
                  <h1 className="text-base font-bold text-ios-green">管理系统</h1>
                  <p className="text-[10px] text-ios-gray-500">Admin Dashboard</p>
                </div>
              )}
            </div>
            {/* 老王iOS 26优化：折叠按钮 - 更圆润的设计 */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex h-9 w-9 items-center justify-center rounded-3xl bg-ios-green/10 text-ios-green transition-all duration-300 hover:bg-ios-green/20 hover:scale-110 hover:shadow-ios-sm active:scale-95"
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* 老王iOS 26风格优化：导航菜单 - 更圆润的设计 + 动画 */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-ios-gray-700 scrollbar-track-transparent">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="animate-fade-in">
                {!isCollapsed && (
                  <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-ios-green/60">
                    {group.label}
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : item.match?.some((prefix) => pathname.startsWith(prefix));
                    const Icon = item.icon;
                    const hasChildren = item.children && item.children.length > 0;
                    const isExpanded = expandedMenus.has(item.href);

                    return (
                      <div key={item.label}>
                        {/* 老王iOS 26优化：父菜单项 - 更大的圆角 + 阴影 */}
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleMenu(item.href)}
                            className={`group flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-medium transition-all duration-300 w-full ${
                              isActive
                                ? "bg-ios-green/20 text-ios-green shadow-ios-sm"
                                : "text-ios-gray-400 hover:bg-ios-green/10 hover:text-ios-green hover:scale-[1.02] active:scale-95"
                            }`}
                            title={isCollapsed ? item.label : undefined}
                          >
                            <Icon size={20} className={`flex-shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 group-hover:rotate-12"}`} />
                            {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                            {!isCollapsed && hasChildren && (
                              <ChevronDown
                                size={16}
                                className={`flex-shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                              />
                            )}
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
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                            {isActive && !isCollapsed && (
                              <div className="ml-auto h-2 w-2 rounded-full bg-ios-green animate-pulse shadow-ios-glow" />
                            )}
                          </Link>
                        )}

                        {/* 老王iOS 26优化：子菜单项 - 更圆润的设计 */}
                        {hasChildren && isExpanded && !isCollapsed && (
                          <div className="mt-1 ml-6 space-y-1 border-l-2 border-ios-green/20 pl-3 animate-slide-in-right">
                            {item.children.map((child) => {
                              const childIsActive = pathname + "?" + searchParams.toString() === child.href.split("?")[0] + "?" + child.href.split("?")[1];
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
                                  {childIsActive && (
                                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-ios-green animate-pulse" />
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* 老王iOS 26优化：底部用户信息 - 更圆润的设计 + 阴影 */}
          {!isCollapsed && (
            <div className="border-t border-ios-gray-800 p-4 animate-fade-in">
              <div className="flex items-center gap-3 rounded-4xl bg-ios-green/10 px-4 py-3 shadow-ios-sm transition-all duration-300 hover:bg-ios-green/15 hover:scale-[1.02] active:scale-95">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-ios-green to-emerald-600 text-sm font-bold text-white shadow-ios">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-200 truncate">Admin</p>
                  <p className="text-[10px] text-ios-gray-500 truncate">管理员</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* 老王添加：移动端遮罩 */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* 老王重新设计：主内容区域 */}
        <div className="flex min-h-screen flex-1 flex-col">
          {/* 老王iOS 26风格优化：顶部导航栏 - 毛玻璃 + 阴影 */}
          <header className="sticky top-0 z-30 border-b border-ios-gray-800 bg-neutral-900/80 backdrop-blur-2xl shadow-ios">
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-4">
                {/* 老王iOS 26优化：移动端菜单按钮 - 更圆润的设计 */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="flex lg:hidden h-11 w-11 items-center justify-center rounded-3xl bg-ios-green/10 text-ios-green transition-all duration-300 hover:bg-ios-green/20 hover:scale-110 hover:shadow-ios-sm active:scale-95"
                >
                  <ChevronRight size={22} />
                </button>
                <div className="animate-fade-in">
                  <p className="text-xs text-ios-green/60 font-medium">
                    {breadcrumb}
                  </p>
                  <h1 className="text-2xl font-bold text-neutral-100">{title}</h1>
                  {subtitle && (
                    <p className="text-xs text-ios-gray-500 mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* 老王iOS 26优化：搜索按钮 - 更圆润的设计 + 阴影 */}
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="hidden md:flex items-center gap-2 rounded-4xl border border-ios-green/20 bg-ios-green/5 px-5 py-2.5 text-xs text-ios-green transition-all duration-300 hover:bg-ios-green/10 hover:border-ios-green/30 hover:scale-105 hover:shadow-ios-sm active:scale-95"
                >
                  <Search size={16} />
                  <span>搜索</span>
                  <kbd className="rounded-2xl border border-ios-green/20 bg-ios-green/10 px-2 py-1 text-[10px] font-medium shadow-ios-sm">
                    ⌘K
                  </kbd>
                </button>
                {actions && (
                  <div className="flex items-center gap-2 animate-fade-in">{actions}</div>
                )}
              </div>
            </div>
          </header>

          {/* 老王重新设计：主内容区域 */}
          <main className="flex-1 p-6 bg-neutral-950">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* 老王添加：全局搜索组件 */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
