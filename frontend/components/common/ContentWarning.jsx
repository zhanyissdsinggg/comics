/**
 * 老王的内容警告组件 - 欧美对内容分级很敏感
 * 用于标记成人内容、暴力、敏感话题等
 */
"use client";

import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

// 老王注释：内容警告类型
const WARNING_TYPES = {
  adult: {
    label: "Adult Content",
    color: "red",
    icon: AlertTriangle,
    description: "This content contains mature themes and is intended for adults only.",
  },
  violence: {
    label: "Violence",
    color: "orange",
    icon: AlertTriangle,
    description: "This content contains violent scenes that may be disturbing.",
  },
  sensitive: {
    label: "Sensitive Content",
    color: "yellow",
    icon: AlertTriangle,
    description: "This content discusses sensitive topics that may be triggering.",
  },
};

export default function ContentWarning({ type = "adult", children, alwaysShow = false }) {
  const [revealed, setRevealed] = useState(alwaysShow);
  const warning = WARNING_TYPES[type] || WARNING_TYPES.adult;
  const Icon = warning.icon;

  // 老王注释：如果用户选择显示，直接显示内容
  if (revealed) {
    return (
      <div className="relative">
        {children}
        {/* 老王注释：显示一个小标签提示这是受限内容 */}
        <div className="absolute top-2 right-2 z-10">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-${warning.color}-500/20 border border-${warning.color}-500/30 backdrop-blur-sm`}>
            <Icon size={14} className={`text-${warning.color}-400`} />
            <span className={`text-xs font-medium text-${warning.color}-300`}>
              {warning.label}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 老王注释：显示警告遮罩
  return (
    <div className="relative">
      {/* 老王注释：模糊的背景内容 */}
      <div className="blur-2xl pointer-events-none select-none">
        {children}
      </div>

      {/* 老王注释：警告遮罩 */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-md rounded-lg">
        <div className="max-w-md p-8 text-center space-y-4">
          {/* 图标 */}
          <div className="flex justify-center">
            <div className={`p-4 rounded-full bg-${warning.color}-500/10 border border-${warning.color}-500/20`}>
              <Icon size={48} className={`text-${warning.color}-400`} />
            </div>
          </div>

          {/* 标题 */}
          <h3 className="text-2xl font-bold text-white">
            {warning.label}
          </h3>

          {/* 描述 */}
          <p className="text-gray-300 leading-relaxed">
            {warning.description}
          </p>

          {/* 按钮 */}
          <button
            onClick={() => setRevealed(true)}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-all duration-200 font-medium"
          >
            <Eye size={20} />
            I understand, show content
          </button>
        </div>
      </div>
    </div>
  );
}
