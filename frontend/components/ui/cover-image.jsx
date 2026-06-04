import Image from "next/image";

import { cn } from "@/lib/utils";

export default function CoverImage({
  src,
  alt,
  sizes = "(max-width: 768px) 160px, 240px",
  className = "",
  objectPosition = "center",
  ...props
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={cn("gush-cover-image", className)}
      style={{ objectPosition }}
      {...props}
    />
  );
}
