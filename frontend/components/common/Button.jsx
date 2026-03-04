/**
 * 鑰佺帇鍒涘缓锛氶€氱敤鎸夐挳缁勪欢
 * 鍔熻兘锛氭敮鎸佸姞杞界姸鎬併€佷笉鍚屾牱寮忋€佽Е鎽稿弽棣? * 閬靛惊 KISS 鍘熷垯锛氱畝娲佹槗鐢ㄧ殑鎸夐挳
 * 閬靛惊 DRY 鍘熷垯锛氱粺涓€鐨勬寜閽牱寮忓拰琛屼负
 */

import { memo } from "react";
import { Loader2 } from "lucide-react";

/**
 * Button 缁勪欢
 * @param {Object} props
 * @param {React.ReactNode} props.children - 鎸夐挳鍐呭
 * @param {boolean} props.loading - 鍔犺浇鐘舵€? * @param {boolean} props.disabled - 绂佺敤鐘舵€? * @param {string} props.variant - 鏍峰紡鍙樹綋锛歱rimary, secondary, outline, ghost, danger
 * @param {string} props.size - 灏哄锛歴m, md, lg
 * @param {string} props.className - 棰濆鐨?CSS 绫诲悕
 * @param {Function} props.onClick - 鐐瑰嚮浜嬩欢
 * @param {string} props.type - 鎸夐挳绫诲瀷锛歜utton, submit, reset
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
  // 鑰佺帇娉ㄩ噴锛氬熀纭€鏍峰紡
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-[16px] font-semibold transition-all duration-300 touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  // 鑰佺帇娉ㄩ噴锛氬昂瀵告牱寮?
  const sizeStyles = {
    sm: "min-h-[36px] px-3 py-1.5 text-xs",
    md: "min-h-[44px] px-4 py-2 text-sm",
    lg: "min-h-[52px] px-6 py-3 text-base",
  };

  // 鑰佺帇娉ㄩ噴锛氬彉浣撴牱寮?
  const variantStyles = {
    primary: "border border-emerald-500/20 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:border-emerald-500/40 hover:bg-emerald-600 hover:scale-[1.05]",
    secondary: "border border-white/5 bg-white/5 text-neutral-200 hover:border-emerald-500/20 hover:bg-emerald-500/5 hover:text-white hover:scale-[1.05]",
    outline: "border border-emerald-500/30 bg-transparent text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:scale-[1.05]",
    ghost: "border border-transparent bg-transparent text-neutral-300 hover:bg-white/5 hover:text-white hover:scale-[1.05]",
    danger: "border border-red-500/20 bg-red-500 text-white shadow-lg shadow-red-500/30 hover:border-red-500/40 hover:bg-red-600 hover:scale-[1.05]",
  };

  // 鑰佺帇娉ㄩ噴锛氱粍鍚堟牱寮?
  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

  // 鑰佺帇娉ㄩ噴锛氬鐞嗙偣鍑讳簨浠?
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