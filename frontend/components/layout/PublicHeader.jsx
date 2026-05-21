"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";

export default function PublicHeader() {
  const pathname = usePathname();
  const variant = pathname === "/" ? "home" : "default";

  return <SiteHeader variant={variant} />;
}
