"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";

/**
 * 老王注释：Avatar头像组件 - iOS风格
 * 功能：显示用户头像，支持图片、文字、图标
 * 遵循KISS原则：简洁的头像展示
 * 遵循DRY原则：可复用的Avatar组件
 */

export const Avatar = memo(function Avatar({
  src,
  alt = "Avatar",
  name,
  size = "md",
  shape = "circle",
  fallback,
  status,
  className = ""
}) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
    xl: "h-16 w-16 text-xl",
    "2xl": "h-20 w-20 text-2xl"
  };

  const shapeClasses = {
    circle: "rounded-full",
    square: "rounded-lg"
  };

  const statusColors = {
    online: "bg-green-500",
    offline: "bg-neutral-500",
    away: "bg-yellow-500",
    busy: "bg-red-500"
  };

  // 老王注释：获取名字的首字母
  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const initials = name ? getInitials(name) : "";

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-400 font-semibold ${sizeClasses[size]} ${shapeClasses[shape]}`}
      >
        {src && !imageError ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : initials ? (
          initials
        ) : fallback ? (
          fallback
        ) : (
          <User size={size === "xs" ? 12 : size === "sm" ? 16 : size === "md" ? 20 : size === "lg" ? 24 : size === "xl" ? 32 : 40} />
        )}
      </div>

      {/* 老王注释：状态指示器 */}
      {status && (
        <span
          className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-neutral-900 ${statusColors[status]}`}
        />
      )}
    </div>
  );
});

// 头像组
export const AvatarGroup = memo(function AvatarGroup({
  avatars = [],
  max = 3,
  size = "md",
  className = ""
}) {
  const displayAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const sizeClasses = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg"
  };

  return (
    <div className={`flex items-center ${className}`}>
      {displayAvatars.map((avatar, index) => (
        <div
          key={index}
          className="-ml-2 first:ml-0"
          style={{ zIndex: displayAvatars.length - index }}
        >
          <Avatar
            {...avatar}
            size={size}
            className="ring-2 ring-neutral-900"
          />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`-ml-2 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-300 font-semibold ring-2 ring-neutral-900 ${sizeClasses[size]}`}
          style={{ zIndex: 0 }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
});

// 带名字的头像
export const AvatarWithName = memo(function AvatarWithName({
  src,
  name,
  subtitle,
  size = "md",
  status,
  className = ""
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Avatar src={src} name={name} size={size} status={status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{name}</p>
        {subtitle && (
          <p className="text-xs text-neutral-400 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
});

export default Avatar;
