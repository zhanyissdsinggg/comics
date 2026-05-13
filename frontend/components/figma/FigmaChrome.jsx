"use client";

import { Lock, ShieldAlert } from "lucide-react";
import { useFigmaSite } from "./FigmaSiteContext";
import { cn } from "./figma-utils";

function FigmaAgeGateModal() {
  const {
    palette,
    showAgeGate,
    setShowAgeGate,
    legalAge,
    confirmAdultMode,
  } = useFigmaSite();

  if (!showAgeGate) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-900/40 bg-[#121212] p-8 shadow-2xl">
        <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-red-600 to-rose-900" />
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mb-3 text-2xl font-black tracking-tight text-white md:text-3xl">
            Age Verification Required
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-gray-400 md:text-base">
            Mature stories are limited to readers {legalAge}+.
            Confirm your age to switch into the adult-only catalog.
          </p>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowAgeGate(false)}
              className="flex-1 rounded-xl border border-transparent bg-gray-800 px-4 py-3.5 font-bold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-700 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAdultMode}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-black text-white transition-all active:scale-95",
                palette.primaryBg,
              )}
            >
              <Lock className="h-5 w-5" />
              I am {legalAge} or older
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// This is an overlay host for Figma surfaces, not a second site-wide shell.
// PublicHeader/PublicFooter still come from AppProviders, while this component
// only mounts page-level overlays such as the adult gate.
export default function FigmaChrome({ children }) {
  return (
    <>
      <FigmaAgeGateModal />
      {children}
    </>
  );
}
