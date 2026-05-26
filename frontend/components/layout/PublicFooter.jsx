"use client";

import { usePathname } from "next/navigation";
import SiteFooter from "./SiteFooter";
import { useInteractiveAvailability } from "../../lib/interactiveAvailability";

export default function PublicFooter({ initialShowInteractiveNav = true }) {
  const pathname = usePathname() || "";
  const { showInteractiveNav } = useInteractiveAvailability();
  const resolvedShowInteractiveNav =
    typeof showInteractiveNav === "boolean"
      ? showInteractiveNav
      : initialShowInteractiveNav;
  const searchQuery =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : "";
  const searchType =
    typeof searchQuery === "string" ? "" : searchQuery.get("type") || "";
  const searchFormat =
    typeof searchQuery === "string" ? "" : searchQuery.get("format") || "";
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
      tone="light"
      variant="compact"
      pathname={footerPathname}
      showTagline={false}
      showInteractiveNav={resolvedShowInteractiveNav}
    />
  );
}
