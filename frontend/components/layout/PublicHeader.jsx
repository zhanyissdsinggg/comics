"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";
import { useInteractiveAvailability } from "../../lib/interactiveAvailability";

export default function PublicHeader() {
  const pathname = usePathname();
  const variant = pathname === "/" ? "home" : "default";
  const { showInteractiveNav } = useInteractiveAvailability();

  return <SiteHeader variant={variant} showInteractiveNav={showInteractiveNav} />;
}
