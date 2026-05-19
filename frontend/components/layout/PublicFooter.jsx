"use client";

import { usePathname } from "next/navigation";
import SiteFooter from "./SiteFooter";

export default function PublicFooter() {
  const pathname = usePathname() || "";
  const searchType =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("type") || ""
      : "";
  const footerPathname =
    pathname === "/search" && searchType
      ? `${pathname}?type=${searchType}`
      : pathname;

  return (
    <SiteFooter
      tone="light"
      variant="compact"
      pathname={footerPathname}
      showTagline={false}
    />
  );
}
