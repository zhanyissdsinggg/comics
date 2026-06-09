"use client";

import { usePathname, useSearchParams } from "next/navigation";
import SiteFooter from "./SiteFooter";
import { useInteractiveAvailability } from "../../lib/interactiveAvailability";

export default function PublicFooter({ initialShowInteractiveNav = true }) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const isHomeRoute = pathname === "/";
  const { showInteractiveNav } = useInteractiveAvailability();
  const resolvedShowInteractiveNav =
    typeof showInteractiveNav === "boolean"
      ? showInteractiveNav
      : initialShowInteractiveNav;
  const searchType = searchParams.get("type") || "";
  const searchFormat = searchParams.get("format") || "";
  const footerPathname =
    pathname === "/search" && (searchType || searchFormat)
      ? `${pathname}?${new URLSearchParams(
          searchType
            ? { type: searchType }
            : { format: searchFormat },
        ).toString()}`
      : pathname;

  return (
    <SiteFooter
      tone={isHomeRoute ? "home" : "default"}
      variant="compact"
      pathname={footerPathname}
      showTagline={false}
      showInteractiveNav={resolvedShowInteractiveNav}
    />
  );
}
