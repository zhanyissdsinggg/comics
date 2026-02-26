/**
 * 老王创建：通用按钮组件
 * 功能：支持加载状态、不同样式、触摸反馈
 * 遵循 KISS 原则：简洁易用的按钮
 * 遵循 DRY 原则：统一的按钮样式和行为
 */

import { memo } from "react";
import { Loader2 } from "lucide-react";

/**
 * Button 组件
 * @param {Object} props
 * @param {React.ReactNode} props.children - 按钮内容
 * @param {boolean} props.loading - 加载状态
 * @param {boolean} props.disabled - 禁用状态
 * @param {string} props.variant - 样式变体：primary, secondary, outline, ghost, danger
 * @param {string} props.size - 尺寸：sm, md, lg
 * @param {string} props.className - 额外的 CSS 类名
 * @param {Function} props.onClick - 点击事件
 * @param {string} props.type - 按钮类型：button, submit, reset
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
  // 老王注释：基础样式
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-[16px] font-semibold transition-all duration-300 touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  // 老王注释：尺寸样式
  const sizeStyles = {
    sm: "min-h-[36px] px-3 py-1.5 text-xs",
    md: "min-h-[44px] px-4 py-2 text-sm",
    lg: "min-h-[52px] px-6 py-3 text-base",
  };

  // 老王注释：变体样式
  const variantStyles = {
    primary: "border border-emerald-500/20 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:border-emerald-500/40 hover:bg-emerald-600 hover:scale-[1.05]",
    secondary: "border border-white/5 bg-white/5 text-neutral-200 hover:border-emerald-500/20 hover:bg-emerald-500/5 hover:text-white hover:scale-[1.05]",
    outline: "border border-emerald-500/30 bg-transparent text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:scale-[1.05]",
    ghost: "border border-transparent bg-transparent text-neutral-300 hover:bg-white/5 hover:text-white hover:scale-[1.05]",
    danger: "border border-red-500/20 bg-red-500 text-white shadow-lg shadow-red-500/30 hover:border-red-500/40 hover:bg-red-600 hover:scale-[1.05]",
  };

  // 老王注释：组合样式
  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

  // 老王注释：处理点击事件
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
      {/* 老王注释：加载状态显示旋转图标 */}
      {loading && (
        <Loader2 size={size === "sm" ? 14 : size === "lg" ? 20 : 16} className="animate-spin" />
      )}
      {children}
    </button>
  );
});

export default Button;
