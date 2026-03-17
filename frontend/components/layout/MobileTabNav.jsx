"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Library, Search, User, Wallet } from "lucide-react";

export default function MobileTabNav() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      path: "/",
      isActive: pathname === "/",
    },
    {
      id: "search",
      label: "Search",
      icon: Search,
      path: "/search",
      isActive: pathname.startsWith("/search"),
    },
    {
      id: "library",
      label: "Library",
      icon: Library,
      path: "/library",
      isActive: pathname === "/library",
    },
    {
      id: "store",
      label: "Store",
      icon: Wallet,
      path: "/store",
      isActive: pathname.startsWith("/store") || pathname.startsWith("/subscribe"),
    },
    {
      id: "account",
      label: "Account",
      icon: User,
      path: "/account",
      isActive:
        pathname === "/account" ||
        pathname === "/orders" ||
        pathname === "/notifications" ||
        pathname === "/profile",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-[linear-gradient(180deg,rgba(7,10,16,0.5),rgba(7,10,16,0.92))] px-3 pb-3 pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,24,39,0.84),rgba(8,11,18,0.94))] px-2 py-2 shadow-2xl shadow-black/20 backdrop-blur-md">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => router.push(tab.path)}
              className={`group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[16px] px-2 py-2.5 transition-all duration-300 ${
                tab.isActive
                  ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(226,232,240,0.94))] text-neutral-950 shadow-lg shadow-white/10"
                  : "text-neutral-300 hover:bg-white/5 active:scale-[0.95]"
              }`}
              aria-label={tab.label}
              aria-current={tab.isActive ? "page" : undefined}
            >
              <Icon size={18} className="transition-transform duration-300 group-hover:scale-110" />
              <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
