/**
 * NOTE: cleaned corrupted comment.
 * NOTE: cleaned corrupted comment.
 * NOTE: cleaned corrupted comment.
 */

import { memo } from "react";
import { Loader2 } from "lucide-react";

/**
 * Button 缁勪欢
 * @param {Object} props
 * @param {React.ReactNode} props.children - 鎸夐挳鍐呭
 * NOTE: cleaned corrupted comment.
 * NOTE: cleaned corrupted comment.
 * @param {string} props.className - 棰濆鐨?CSS 绫诲悕
 * @param {Function} props.onClick - 鐐瑰嚮浜嬩欢
 * NOTE: cleaned corrupted comment.
 */
const Button = memo(function Button({
  children,
  loading = false,
  disabled = false,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  type = "button",
  ...props
}) {
  // NOTE: cleaned corrupted comment.
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-[16px] font-semibold transition-all duration-300 touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  // NOTE: cleaned corrupted comment.
  const sizeStyles = {
    sm: "min-h-[36px] px-3 py-1.5 text-xs",
    md: "min-h-[44px] px-4 py-2 text-sm",
    lg: "min-h-[52px] px-6 py-3 text-base",
  };

  // NOTE: cleaned corrupted comment.
  const variantStyles = {
    primary: "border border-emerald-500/20 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:border-emerald-500/40 hover:bg-emerald-600 hover:scale-[1.05]",
    secondary: "border border-white/5 bg-white/5 text-neutral-200 hover:border-emerald-500/20 hover:bg-emerald-500/5 hover:text-white hover:scale-[1.05]",
    outline: "border border-emerald-500/30 bg-transparent text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:scale-[1.05]",
    ghost: "border border-transparent bg-transparent text-neutral-300 hover:bg-white/5 hover:text-white hover:scale-[1.05]",
    danger: "border border-red-500/20 bg-red-500 text-white shadow-lg shadow-red-500/30 hover:border-red-500/40 hover:bg-red-600 hover:scale-[1.05]",
  };

  // NOTE: cleaned corrupted comment.
  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

  // NOTE: cleaned corrupted comment.
  const handleClick = (event) => {
    if (loading || disabled) {
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      className={combinedStyles}
      onClick={handleClick}
      disabled={disabled || loading}
      style={{ WebkitTapHighlightColor: "transparent" }}
      {...props}
    >
      {/* 鑰佺帇娉ㄩ噴锛氬姞杞界姸鎬佹樉绀烘棆杞浘鏍?*/}
      {loading && (
        <Loader2 size={size === "sm" ? 14 : size === "lg" ? 20 : 16} className="animate-spin" />
      )}
      {children}
    </button>
  );
});

export default Button;