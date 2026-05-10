"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Lock,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useReaderSettingsStore } from "../../store/useReaderSettingsStore";
import { useAuthStore } from "../../store/useAuthStore";
import FigmaChrome from "./FigmaChrome";
import { FigmaSiteProvider, useFigmaSite } from "./FigmaSiteContext";
import { cn } from "./figma-utils";

function SettingsToggle({ label, description, checked, onClick, accentClass }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left transition-colors hover:bg-white/8 md:p-4"
    >
      <div>
        <h3 className="text-base font-black text-white">{label}</h3>
        <p className="mt-1 text-sm leading-5 text-gray-400 md:leading-6">{description}</p>
      </div>
      <div
        className={cn(
          "relative flex h-8 w-14 items-center rounded-full px-1 transition-colors",
          checked ? accentClass : "bg-gray-700",
        )}
      >
        <div
          className={cn(
            "h-6 w-6 rounded-full bg-white shadow-md transition-transform",
            checked ? "translate-x-6" : "translate-x-0",
          )}
        />
      </div>
    </button>
  );
}

function SettingsContent() {
  const router = useRouter();
  const { palette, isAdultMode, handleAdultToggle, openLogin } = useFigmaSite();
  const { isSignedIn } = useAuthStore();
  const { legalAge } = useAdultGateStore();
  const {
    layoutMode,
    setLayoutMode,
    nightMode,
    toggleNightMode,
    autoScroll,
    setAutoScroll,
  } = useReaderSettingsStore();
  const [pinEnabled, setPinEnabled] = useState(false);

  const accentClass = isAdultMode ? "bg-red-500" : "bg-indigo-500";

  return (
    <div className={cn("min-h-screen pb-20", palette.rootBg)}>
      <FigmaChrome>
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <section
            className={cn(
              "mb-6 overflow-hidden rounded-[32px] border p-5 shadow-2xl md:mb-8 md:p-7",
              palette.surface,
              palette.border,
            )}
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
              Preferences
            </p>
            <h1 className="mt-1.5 text-3xl font-black tracking-tight text-white md:mt-2 md:text-4xl">
              Reading, safety, and account behavior.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Adjust how you read, control mature visibility, and keep your device preferences comfortable.
            </p>
          </section>

          <div className="space-y-5 md:space-y-6">
            <section
              className={cn(
                "rounded-[28px] border p-5 shadow-xl md:p-6",
                palette.surface,
                palette.border,
              )}
            >
              <div className="mb-5 flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl md:h-12 md:w-12",
                    isAdultMode ? "bg-red-500/12 text-red-400" : "bg-indigo-500/12 text-indigo-300",
                  )}
                >
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Content Safety</h2>
                  <p className="text-sm text-gray-400">
                    Mature visibility and {legalAge}+ verification.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <SettingsToggle
                  label={`${legalAge}+ mode`}
                  description="Enable access to mature titles from the public catalog."
                  checked={isAdultMode}
                  onClick={handleAdultToggle}
                  accentClass={accentClass}
                />
                <SettingsToggle
                  label="PIN lock"
                  description="Add an extra confirmation step before mature titles open on this device."
                  checked={pinEnabled}
                  onClick={() => setPinEnabled((value) => !value)}
                  accentClass={accentClass}
                />
                {!isSignedIn ? (
                  <button
                    type="button"
                    onClick={() => openLogin("login", "/settings")}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98] sm:w-auto sm:justify-start",
                      palette.primaryBg,
                    )}
                  >
                    <Lock className="h-4 w-4" />
                    Sign in for synced settings
                  </button>
                ) : null}
              </div>
            </section>

            <section
              className={cn(
                "rounded-[28px] border p-5 shadow-xl md:p-6",
                palette.surface,
                palette.border,
              )}
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/12 text-sky-400 md:h-12 md:w-12">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Reader Preferences</h2>
                  <p className="text-sm text-gray-400">
                    Choose the reading behavior that feels best on this device.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={() => setLayoutMode("vertical")}
                  className={cn(
                    "rounded-[24px] border p-3.5 text-left transition-all md:p-5",
                    layoutMode === "vertical"
                      ? "border-sky-400/40 bg-sky-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/8",
                  )}
                >
                  <div className="mb-3 h-16 rounded-2xl bg-black/30 p-2.5 md:mb-4 md:h-28 md:p-4">
                    <div className="mx-auto h-8 w-8 rounded-lg bg-gray-600 md:h-14 md:w-12" />
                    <div className="mx-auto mt-1.5 h-6 w-8 rounded-lg bg-gray-700 md:mt-2 md:h-10 md:w-12" />
                  </div>
                  <h3 className="text-sm font-black text-white md:text-lg">Vertical Scroll</h3>
                  <p className="mt-1.5 text-xs leading-5 text-gray-400 md:mt-2 md:text-sm md:leading-6">
                    Best fit for the long-strip reading flow already used by the comic reader.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutMode("horizontal")}
                  className={cn(
                    "rounded-[24px] border p-3.5 text-left transition-all md:p-5",
                    layoutMode === "horizontal"
                      ? "border-sky-400/40 bg-sky-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/8",
                  )}
                >
                  <div className="mb-3 flex h-16 items-center justify-center gap-1.5 rounded-2xl bg-black/30 p-2.5 md:mb-4 md:h-28 md:gap-2 md:p-4">
                    <div className="h-10 w-7 rounded-lg bg-gray-600 md:h-16 md:w-12" />
                    <div className="h-10 w-7 rounded-lg bg-gray-700 md:h-16 md:w-12" />
                  </div>
                  <h3 className="text-sm font-black text-white md:text-lg">Horizontal Paged</h3>
                  <p className="mt-1.5 text-xs leading-5 text-gray-400 md:mt-2 md:text-sm md:leading-6">
                    Better for page-like reading when the reader supports side-by-side motion.
                  </p>
                </button>
              </div>

              <div className="mt-5 space-y-3 md:mt-6 md:space-y-4">
                <SettingsToggle
                  label="Night mode"
                  description="Maps to the existing reader night-mode switch."
                  checked={nightMode}
                  onClick={toggleNightMode}
                  accentClass="bg-sky-500"
                />
                <SettingsToggle
                  label="Auto scroll"
                  description="Uses the same auto-scroll flag as the current reader settings panel."
                  checked={autoScroll}
                  onClick={() => setAutoScroll(!autoScroll)}
                  accentClass="bg-sky-500"
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-red-500/20 bg-red-500/8 p-5 shadow-xl md:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/12 text-red-400 md:h-12 md:w-12">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-black text-white">Danger Zone</h2>
                  <p className="mt-2 text-sm leading-5 text-gray-300 md:leading-6">
                    Need help with account access, billing, or a sensitive request? Support can handle it directly.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => router.push("/support")}
                      className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-500/15 sm:w-auto"
                    >
                      Contact support
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/account")}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:w-auto"
                    >
                      Back to account
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </FigmaChrome>
    </div>
  );
}

export default function FigmaSettingsPage() {
  return (
    <FigmaSiteProvider>
      <SettingsContent />
    </FigmaSiteProvider>
  );
}
