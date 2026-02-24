"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * 老王注释：管理员统一布局组件 - 所有admin页面都用这个
 * 这个SB组件提供导航、侧边栏、顶部栏，让所有admin页面保持一致的风格
 */
export function AdminLayout({ children, title = "Dashboard" }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 老王说：导航菜单项
  const menuItems = [
    { label: "Dashboard", href: "/admin", icon: "📊" },
    { label: "作品管理", href: "/admin/series", icon: "📚" },
    { label: "用户管理", href: "/admin/users", icon: "👥" },
    { label: "订单管理", href: "/admin/orders", icon: "💳" },
    { label: "促销活动", href: "/admin/promotions", icon: "🎉" },
    { label: "账单管理", href: "/admin/billing", icon: "💰" },
    { label: "邮件配置", href: "/admin/email-settings", icon: "📧" },
    { label: "通知管理", href: "/admin/notifications", icon: "🔔" },
    { label: "评论管理", href: "/admin/comments", icon: "💬" },
    { label: "操作日志", href: "/admin/logs", icon: "📝" },
    { label: "设置", href: "/admin/settings", icon: "⚙️" },
  ];

  // 老王说：处理登出
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      router.push("/admin/login");
    }
  };

  return (
    <div className="flex h-screen bg-neutral-950">
      {/* 老王说：侧边栏 */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-neutral-900/50 border-r border-white/10 transition-all duration-300 flex flex-col`}
      >
        {/* 老王说：Logo区域 */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <h1 className="text-lg font-bold text-white">Gush Admin</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded transition-colors"
            >
              {sidebarOpen ? "←" : "→"}
            </button>
          </div>
        </div>

        {/* 老王说：菜单项 */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-neutral-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* 老王说：登出按钮 */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <span className="text-xl">🚪</span>
            {sidebarOpen && <span className="text-sm">登出</span>}
          </button>
        </div>
      </aside>

      {/* 老王说：主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 老王说：顶部栏 */}
        <header className="bg-neutral-900/50 border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-neutral-400">
                {new Date().toLocaleDateString("zh-CN")}
              </div>
            </div>
          </div>
        </header>

        {/* 老王说：内容区域 */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
