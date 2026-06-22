"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";
import { useInteractiveAvailability } from "../../lib/interactiveAvailability";

export default function PublicHeader({ initialShowInteractiveNav = true }) {
  const pathname = usePathname();
  const variant = pathname === "/" ? "home" : "default";
  const { showInteractiveNav } = useInteractiveAvailability();
  const resolvedShowInteractiveNav =
    typeof showInteractiveNav === "boolean"
      ? showInteractiveNav
      : initialShowInteractiveNav;
  const showMobileBottomNav = !pathname?.startsWith("/read");

  return (
    <SiteHeader
      variant={variant}
      showInteractiveNav={resolvedShowInteractiveNav}
      showMobileBottomNav={showMobileBottomNav}
    />
  );
}
