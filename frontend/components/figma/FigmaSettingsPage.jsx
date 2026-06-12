"use client";

import { useState } from "react";
import { AlertTriangle, Lock, ShieldAlert, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
  StorefrontInfoCard,
  StorefrontSectionHeading,
} from "../common/StorefrontPagePrimitives";
import { StorefrontPage } from "../storefront/StorefrontScaffold";
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
      className="flex w-full items-center justify-between gap-4 rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.035)] p-4 text-left shadow-[0_18px_38px_rgba(8,6,20,0.24)] backdrop-blur-xl transition-all duration-150 hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.075)]"
    >
      <div className="min-w-0">
        <h3 className="text-base font-semibold tracking-[-0.03em] text-white">
          {label}
        </h3>
        <p className="mt-2 text-sm leading-6 text-white/62">{description}</p>
      </div>
      <div
        className={cn(
          "relative flex h-8 w-14 shrink-0 items-center rounded-full px-1 transition-colors",
          checked ? accentClass : "bg-white/12",
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

function LayoutChoice({ active, title, description, onClick, preview }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[28px] border p-4 text-left shadow-[0_18px_38px_rgba(8,6,20,0.24)] transition-all duration-150 hover:-translate-y-1 active:scale-[0.99] md:p-5",
        active
          ? "border-cyan-300/28 bg-[linear-gradient(135deg,rgba(92,228,255,0.16)_0%,rgba(255,79,154,0.1)_100%)]"
          : "border-white/10 bg-[rgba(255,255,255,0.035)] hover:bg-[rgba(255,255,255,0.075)]",
      )}
    >
      <div className={`mb-4 overflow-hidden ${storefrontSoftCardClass} p-3`}>
        {preview}
      </div>
      <h3 className="text-base font-semibold tracking-[-0.03em] text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-white/62">{description}</p>
    </button>
  );
}

function SettingsContent() {
  const router = useRouter();
  const { isAdultMode, handleAdultToggle, openLogin } = useFigmaSite();
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

  const accent = isAdultMode ? "rose" : "blue";
  const accentClass = isAdultMode ? "bg-rose-500" : "bg-cyan-400";

  return (
    <StorefrontPage accentClass="from-[rgba(82,188,255,0.12)] via-[rgba(167,139,250,0.08)] to-[rgba(255,87,166,0.1)]">
      <FigmaChrome>
        <div className="flex flex-col gap-8">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <EditorialHero
              accent={accent}
              appearance="dark"
              eyebrow="Preferences"
              title="Reading, safety, and device behavior stay in one control room."
              description="This page keeps the existing reader settings, adult gate controls, and sign-in hooks. The UI now matches the rest of the dark storefront system."
              secondary={isAdultMode ? "18+ mode active" : "Standard mode active"}
              stats={[
                {
                  label: "Content mode",
                  value: isAdultMode ? "Adult mode" : "Normal mode",
                  hint: "Still driven by the current mutual exclusion gate.",
                },
                {
                  label: "Reader layout",
                  value:
                    layoutMode === "horizontal"
                      ? "Horizontal paged"
                      : "Vertical scroll",
                  hint: "Uses the existing reader settings store.",
                },
                {
                  label: "Night mode",
                  value: nightMode ? "On" : "Off",
                  hint: "Mapped to the same reader setting flag.",
                },
              ]}
            />

            <SurfacePanel
              tone="muted"
              accent={accent}
              appearance="dark"
              className="space-y-4"
            >
              <StorefrontSectionHeading
                eyebrow="Reader Snapshot"
                title="What this device is using right now"
                description="Every switch below still writes into the same stores and handlers already wired into the app."
              />

              <div className="grid gap-3">
                <div className={storefrontSoftCardClass}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                    Adult gate
                  </p>
                  <p className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.04em] text-white">
                    {isAdultMode ? `${legalAge}+ unlocked` : "Normal only"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/64">
                    Catalog visibility remains split by the existing normal and
                    adult mode filter logic.
                  </p>
                </div>

                <div className={storefrontSoftCardClass}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                    Sync state
                  </p>
                  <p className="mt-2 font-display text-[1.4rem] font-semibold tracking-[-0.04em] text-white">
                    {isSignedIn ? "Signed in" : "Guest reader"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/64">
                    Login prompts still route through the existing auth entry
                    flow when synced settings are needed.
                  </p>
                </div>
              </div>
            </SurfacePanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <SurfacePanel
                tone="muted"
                accent={accent}
                appearance="dark"
                className="space-y-5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-[18px] border shadow-[0_16px_30px_rgba(8,6,20,0.22)]",
                      isAdultMode
                        ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                        : "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
                    )}
                  >
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <StorefrontSectionHeading
                    eyebrow="Content Safety"
                    title="Gate mature visibility the same way, just cleaner"
                    description={`Normal mode stays normal-only. Adult mode stays ${legalAge}+ only. No business logic was rewritten here.`}
                    className="space-y-2"
                  />
                </div>

                <div className="space-y-4">
                  <SettingsToggle
                    label={`${legalAge}+ mode`}
                    description="Enable access to mature titles from the public catalog using the current adult gate handler."
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
                      className={storefrontPrimaryButtonClass}
                    >
                      <Lock className="h-4 w-4" />
                      Sign in for synced settings
                    </button>
                  ) : null}
                </div>
              </SurfacePanel>

              <SurfacePanel
                tone="muted"
                accent={accent}
                appearance="dark"
                className="space-y-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[0_16px_30px_rgba(8,6,20,0.22)]">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <StorefrontSectionHeading
                    eyebrow="Reader Preferences"
                    title="Keep the reader behavior tuned to the device"
                    description="Layout, night mode, and auto scroll continue to use the existing reader settings store."
                    className="space-y-2"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <LayoutChoice
                    active={layoutMode === "vertical"}
                    title="Vertical Scroll"
                    description="Best fit for the long-strip reading flow already used by the comic reader."
                    onClick={() => setLayoutMode("vertical")}
                    preview={
                      <div className="mx-auto flex w-16 flex-col gap-2">
                        <div className="h-10 rounded-xl bg-white/18" />
                        <div className="h-7 rounded-xl bg-white/10" />
                        <div className="h-9 rounded-xl bg-white/14" />
                      </div>
                    }
                  />
                  <LayoutChoice
                    active={layoutMode === "horizontal"}
                    title="Horizontal Paged"
                    description="Better for page-like reading when the reader supports side-to-side motion."
                    onClick={() => setLayoutMode("horizontal")}
                    preview={
                      <div className="mx-auto flex w-full max-w-[7rem] items-center justify-center gap-2">
                        <div className="h-16 w-11 rounded-xl bg-white/18" />
                        <div className="h-16 w-11 rounded-xl bg-white/10" />
                      </div>
                    }
                  />
                </div>

                <div className="space-y-4">
                  <SettingsToggle
                    label="Night mode"
                    description="Maps directly to the existing reader night-mode switch."
                    checked={nightMode}
                    onClick={toggleNightMode}
                    accentClass="bg-cyan-400"
                  />
                  <SettingsToggle
                    label="Auto scroll"
                    description="Uses the same auto-scroll flag as the current reader settings panel."
                    checked={autoScroll}
                    onClick={() => setAutoScroll(!autoScroll)}
                    accentClass="bg-cyan-400"
                  />
                </div>
              </SurfacePanel>
            </div>

            <div className="grid gap-4">
              <StorefrontInfoCard
                eyebrow="Mode Rules"
                title="Mutual exclusion stays intact"
                description="This settings shell does not touch the filtering implementation. It only calls the existing toggle handler exposed by the site context."
              />

              <SurfacePanel
                tone="danger"
                accent="rose"
                appearance="dark"
                className="space-y-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-rose-300/20 bg-rose-400/10 text-rose-200 shadow-[0_16px_30px_rgba(8,6,20,0.22)]">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                      Danger Zone
                    </p>
                    <h3 className="mt-2 font-display text-[1.45rem] font-semibold tracking-[-0.04em] text-white">
                      Sensitive account and billing issues belong with support
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-white/64">
                      Need help with account access, purchases, or something
                      sensitive? Use the existing support and account routes.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/support")}
                    className={storefrontPrimaryButtonClass}
                  >
                    Contact support
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/account")}
                    className={storefrontSecondaryButtonClass}
                  >
                    Back to account
                  </button>
                </div>
              </SurfacePanel>
            </div>
          </section>
        </div>
      </FigmaChrome>
    </StorefrontPage>
  );
}

export default function FigmaSettingsPage() {
  return (
    <FigmaSiteProvider>
      <SettingsContent />
    </FigmaSiteProvider>
  );
}
