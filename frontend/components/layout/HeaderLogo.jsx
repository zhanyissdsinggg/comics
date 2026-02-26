"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useBrandingStore } from "../../store/useBrandingStore";

/**
 * 老王注释：Logo组件 - 只负责显示Logo和品牌名称
 * 职责单一：点击跳转首页 + 显示Logo或品牌名
 */
export default function HeaderLogo() {
  const router = useRouter();
  const { branding } = useBrandingStore();

  return (
    <button
      type="button"
      onClick={() => router.push("/")}
      className="flex items-center gap-2 text-lg font-semibold tracking-wide text-white transition-all duration-300 hover:scale-[1.02]"
      aria-label="Go to home"
    >
      {branding?.siteLogoUrl ? (
        <Image
          src={branding.siteLogoUrl}
          alt="Site logo"
          width={120}
          height={28}
          className="h-7 w-auto"
          priority
        />
      ) : (
        "Gush"
      )}
    </button>
  );
}
