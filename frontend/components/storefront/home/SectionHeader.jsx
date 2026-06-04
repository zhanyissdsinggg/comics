"use client";

import { ArrowUpRight } from "lucide-react";
import SharedSectionHeader from "@/components/ui/section-header";

export default function SectionHeader({
  eyebrow = "",
  title,
  description = "",
  actionLabel = "",
  actionHref = "",
}) {
  return (
    <SharedSectionHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={description}
      actionLabel={actionLabel}
      actionHref={actionHref}
      actionIcon={ArrowUpRight}
    />
  );
}
