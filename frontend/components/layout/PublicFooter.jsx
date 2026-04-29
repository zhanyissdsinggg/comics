"use client";

import { usePathname } from "next/navigation";
import SiteFooter from "./SiteFooter";

export default function PublicFooter() {
  const pathname = usePathname() || "";

  return (
    <SiteFooter
      tone="light"
      variant="compact"
      pathname={pathname}
      showTagline={false}
    />
  );
}
