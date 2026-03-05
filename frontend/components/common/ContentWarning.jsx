/**
 * NOTE: cleaned corrupted comment.
 * 闁活潿鍔嬬花顒勫冀閸ヮ亶鍞堕柟瀛樺姃濮瑰宕橀崨顓у晣闁靛棔鐒﹀В姘跺礉濞戞牑鍋撴担瑙勬珱闁规壆鍠曢惁鑺ワ紣濡偐鎼?
 */
"use client";

import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

// NOTE: cleaned corrupted comment.
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

  // NOTE: cleaned corrupted comment.
  if (revealed) {
    return (
      <div className="relative">
        {children}
        {/* 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欑濡绮堟潪鎵伇濞戞搩浜滈惃顒勫冀閸モ晩鍔柟缁樺姉閵囨碍娼诲▎鎰﹂柛娆愵殜濡炬椽宕橀崨顓у晣 */}
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

  // 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欑濡绮堟ウ娆惧妳闁告稑锕导鍕磾?
  return (
    <div className="relative">
      {/* 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欑鑶╃紒顖氾功濞堟垿鎳楃仦鐐彲闁告劕鎳庨?*/}
      <div className="blur-2xl pointer-events-none select-none">
        {children}
      </div>

      {/* 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欎亢椤掔喖宕ㄦ繝鍥︾磿缂?*/}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 backdrop-blur-md rounded-lg">
        <div className="max-w-md p-8 text-center space-y-4">
          {/* 闁搞儳鍋撻悥?*/}
          <div className="flex justify-center">
            <div className={`p-4 rounded-full bg-${warning.color}-500/10 border border-${warning.color}-500/20`}>
              <Icon size={48} className={`text-${warning.color}-400`} />
            </div>
          </div>

          {/* 闁哄秴娲。?*/}
          <h3 className="text-2xl font-bold text-white">
            {warning.label}
          </h3>

          {/* 闁硅绻楅崼?*/}
          <p className="text-gray-300 leading-relaxed">
            {warning.description}
          </p>

          {/* 闁圭顦甸幐?*/}
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