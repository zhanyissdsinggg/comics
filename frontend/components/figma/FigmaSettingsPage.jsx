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
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/8"
    >
      <div>
        <h3 className="text-base font-black text-white">{label}</h3>
        <p className="mt-1 text-sm leading-6 text-gray-400">{description}</p>
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
    <div className={cn("min-h-screen pt-24 pb-20", palette.rootBg)}>
      <FigmaChrome>
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <section
            className={cn(
              "mb-8 overflow-hidden rounded-[32px] border p-8 shadow-2xl",
              palette.surface,
              palette.border,
            )}
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
              Preferences
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">
              Reading, safety, and account behavior.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
              This page fronts the real reader settings and adult-gate store, but with the new visual shell.
            </p>
          </section>

          <div className="space-y-6">
            <section
              className={cn(
                "rounded-[28px] border p-6 shadow-xl",
                palette.surface,
                palette.border,
              )}
            >
              <div className="mb-6 flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
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
                  description="Mock UI from the Figma file. Real PIN enforcement is not wired yet."
                  checked={pinEnabled}
                  onClick={() => setPinEnabled((value) => !value)}
                  accentClass={accentClass}
                />
                {!isSignedIn ? (
                  <button
                    type="button"
                    onClick={() => openLogin("login", "/settings")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-transform active:scale-[0.98]",
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
                "rounded-[28px] border p-6 shadow-xl",
                palette.surface,
                palette.border,
              )}
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/12 text-sky-400">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Reader Preferences</h2>
                  <p className="text-sm text-gray-400">
                    Backed by the existing reader settings store.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setLayoutMode("vertical")}
                  className={cn(
                    "rounded-[24px] border p-5 text-left transition-all",
                    layoutMode === "vertical"
                      ? "border-sky-400/40 bg-sky-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/8",
                  )}
                >
                  <div className="mb-4 h-28 rounded-2xl bg-black/30 p-4">
                    <div className="mx-auto h-14 w-12 rounded-lg bg-gray-600" />
                    <div className="mx-auto mt-2 h-10 w-12 rounded-lg bg-gray-700" />
                  </div>
                  <h3 className="text-lg font-black text-white">Vertical Scroll</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Best fit for the long-strip reading flow already used by the comic reader.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutMode("horizontal")}
                  className={cn(
                    "rounded-[24px] border p-5 text-left transition-all",
                    layoutMode === "horizontal"
                      ? "border-sky-400/40 bg-sky-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/8",
                  )}
                >
                  <div className="mb-4 flex h-28 items-center justify-center gap-2 rounded-2xl bg-black/30 p-4">
                    <div className="h-16 w-12 rounded-lg bg-gray-600" />
                    <div className="h-16 w-12 rounded-lg bg-gray-700" />
                  </div>
                  <h3 className="text-lg font-black text-white">Horizontal Paged</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Better for page-like reading when the reader supports side-by-side motion.
                  </p>
                </button>
              </div>

              <div className="mt-6 space-y-4">
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

            <section className="rounded-[28px] border border-red-500/20 bg-red-500/8 p-6 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/12 text-red-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-black text-white">Danger Zone</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    The Figma design includes account-destruction controls, but the current app does not expose that safely here.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/support")}
                      className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-red-300 transition-colors hover:bg-red-500/15"
                    >
                      Contact support
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/account")}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
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
