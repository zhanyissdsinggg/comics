"use client";

import SharedGradientButton from "@/components/ui/gradient-button";

export default function GradientButton({
  className = "",
  ...props
}) {
  return (
    <SharedGradientButton
      className={`px-5 ${className}`.trim()}
      {...props}
    />
  );
}
