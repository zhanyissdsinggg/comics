"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import {
  StorefrontInfoCard,
  StorefrontSectionHeading,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import AgeGateModal from "../layout/AgeGateModal";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import { getRegionConfig } from "../../lib/region/config";
import { buildSupportPath } from "../../lib/supportRouting";

const REGION_KEY = "mn_region";
const HIDE_ADULT_KEY = "mn_hide_adult_history";

function readStorage(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }
  return window.localStorage.getItem(key) || fallback;
}

function persistHideAdultHistory(value) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(HIDE_ADULT_KEY, value ? "1" : "0");
}

export default function MatureContentSettingsPage() {
  const { hydrated, isSignedIn } = useAuthStore();
  const {
    adultConfirmed,
    ageRuleKey,
    legalAge,
    isAdultMode,
    requestAdultToggle,
    confirmAge,
  } = useAdultGateStore();
  const [region, setRegion] = useState("global");
  const [hideAdultHistory, setHideAdultHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [activeModal, setActiveModal] = useState(null);

  const viewerSignedIn = hydrated && isSignedIn;
  const regionConfig = useMemo(() => getRegionConfig(region), [region]);
  const maturityStatusLabel = useMemo(() => {
    if (!viewerSignedIn) {
      return "Sign in required";
    }
    if (!adultConfirmed) {
      return "Age confirmation needed";
    }
    return isAdultMode ? "Visible on this device" : "Hidden on this device";
  }, [adultConfirmed, isAdultMode, viewerSignedIn]);

  useEffect(() => {
    setRegion(readStorage(REGION_KEY, "global"));
    setHideAdultHistory(readStorage(HIDE_ADULT_KEY, "0") === "1");
  }, []);

  useEffect(() => {
    if (!viewerSignedIn) {
      return;
    }

    let mounted = true;
    apiGet("/api/preferences").then((response) => {
      if (!mounted || !response.ok) {
        return;
      }

      const preferences = response.data?.preferences || {};
      if (preferences.region) {
        setRegion(preferences.region);
      }
      if (typeof preferences.hideAdultHistory === "boolean") {
        setHideAdultHistory(preferences.hideAdultHistory);
        persistHideAdultHistory(preferences.hideAdultHistory);
      }
    });

    return () => {
      mounted = false;
    };
  }, [viewerSignedIn]);

  const openAuthPrompt = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(
      new CustomEvent("auth:open", {
        detail: { returnTo: "/mature-content" },
      }),
    );
  }, []);

  const handleMatureVisibility = useCallback(() => {
    setFeedback("");

    if (!viewerSignedIn) {
      openAuthPrompt();
      return;
    }

    const status = requestAdultToggle(true);
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }

    if (status === "OK") {
      setFeedback(
        isAdultMode
          ? "Mature content is now hidden on this device."
          : "Mature content is now visible on this device.",
      );
    }
  }, [isAdultMode, openAuthPrompt, requestAdultToggle, viewerSignedIn]);

  const handleAgeConfirm = useCallback(() => {
    confirmAge(ageRuleKey);
    setActiveModal(null);
    setFeedback("Age confirmed. Mature content is now visible on this device.");
  }, [ageRuleKey, confirmAge]);

  const handleHideHistoryChange = useCallback(
    async (nextValue) => {
      setHideAdultHistory(nextValue);
      persistHideAdultHistory(nextValue);
      setFeedback("");

      if (!viewerSignedIn) {
        setFeedback("Saved on this device.");
        return;
      }

      setSaving(true);
      const payload = {
        hideAdultHistory: nextValue,
      };
      const response = await apiPost("/api/preferences", {
        preferences: payload,
      });
      if (response.ok) {
        setFeedback("Saved to your account and this device.");
      } else {
        setFeedback(response.error || "Couldn't save that setting.");
      }
      setSaving(false);
    },
    [viewerSignedIn],
  );

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow="Mature content"
            title="18+ settings"
            description="Control mature title visibility and how 18+ reading history is handled."
            stats={[
              {
                label: "Visibility",
                value: maturityStatusLabel,
              },
              {
                label: "Legal age",
                value: `${regionConfig.legalAge}+`,
              },
              {
                label: "History",
                value: hideAdultHistory ? "Hidden on device" : "Visible on device",
              },
            ]}
          />

          <SurfacePanel
            className="space-y-4 border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            appearance="dark"
            accent="blue"
          >
            <StorefrontSectionHeading
              eyebrow="Support"
              title="Need help?"
              description="Use the mature content access support topic if the gate or visibility settings get stuck."
            />
            <Link
              href={buildSupportPath({
                topic: "adult",
                context: "Mature content access help",
              })}
              className={storefrontSecondaryButtonClass}
            >
              Contact support
            </Link>
          </SurfacePanel>
        </section>

        {feedback ? (
          <SurfacePanel
            className="border-2 border-white/15 bg-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            appearance="dark"
            accent="blue"
          >
            <p className="text-sm font-semibold text-white/80">{feedback}</p>
          </SurfacePanel>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SurfacePanel
            className="space-y-5 border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            appearance="dark"
            accent="blue"
          >
            <StorefrontSectionHeading
              eyebrow="Mature content visibility"
              title="Choose when 18+ titles can appear"
              description="Mature titles stay hidden until you sign in and confirm your age on this device."
            />

            <div className="rounded-[24px] border-2 border-white/15 bg-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
                Current status
              </p>
              <p className="mt-2 text-lg font-black uppercase tracking-[-0.03em] text-white">
                {maturityStatusLabel}
              </p>
              <p className="mt-3 text-sm font-medium leading-6 text-white/70">
                {viewerSignedIn
                  ? adultConfirmed
                    ? "You can turn mature visibility on or off for this device anytime."
                    : `Your region is set to ${regionConfig.label}. Confirm ${regionConfig.legalAge}+ access before opening mature titles.`
                  : "Sign in first. Mature access is not enabled for signed-out readers."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleMatureVisibility}
                className={storefrontPrimaryButtonClass}
              >
                {!viewerSignedIn
                  ? "Sign in to manage 18+"
                  : !adultConfirmed
                    ? "Confirm age for 18+"
                    : isAdultMode
                      ? "Hide mature titles"
                      : "Show mature titles"}
              </button>
              <Link
                href="/adult"
                className={storefrontSecondaryButtonClass}
              >
                Open mature catalog
              </Link>
            </div>
          </SurfacePanel>

          <SurfacePanel
            className="space-y-5 border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            appearance="dark"
            accent="blue"
          >
            <StorefrontSectionHeading
              eyebrow="History"
              title="Hide mature reading history on this device"
              description="This only changes how 18+ reading activity appears on the device you're using right now."
            />

            <label className="flex items-start gap-3 rounded-[24px] border-2 border-white/15 bg-black px-4 py-4 text-sm font-semibold text-white/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <input
                type="checkbox"
                checked={hideAdultHistory}
                onChange={(event) =>
                  handleHideHistoryChange(event.target.checked)
                }
                disabled={saving}
                className="mt-1 h-4 w-4 rounded-none border-[2px] border-white/30 bg-black text-[#00E5FF] focus:ring-0"
              />
              <span>
                Hide mature reading history on this device
              </span>
            </label>

            <div className="rounded-[24px] border-2 border-white/15 bg-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
                Local vs account-level
              </p>
              <div className="mt-3 space-y-3 text-sm font-medium leading-6 text-white/70">
                <p>
                  Mature visibility and age confirmation are stored on this device
                  using your existing local access settings.
                </p>
                <p>
                  Hide 18+ history changes the visible reading history on this
                  device first. If you're signed in, we also save that preference
                  to your account so it can sync back later.
                </p>
              </div>
            </div>
          </SurfacePanel>
        </div>

        <SurfacePanel
          className="space-y-5 border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          appearance="dark"
          accent="blue"
        >
          <StorefrontSectionHeading
            eyebrow="How it works"
            title="What 18+ means here"
            description="Mature titles stay gated until the reader signs in, passes the age check for their region, and turns mature visibility on."
          />
          <div className="grid gap-3 md:grid-cols-3">
            <StorefrontInfoCard
              title="Sign in first"
              description="Signed-out users can't open mature titles."
              className="border-2 border-white/15 bg-black"
            />
            <StorefrontInfoCard
              title="Confirm age"
              description={`Your current region uses a ${regionConfig.legalAge}+ age rule.`}
              className="border-2 border-white/15 bg-black"
            />
            <StorefrontInfoCard
              title="Prompt before opening"
              description="If a title is marked 18+, the age gate appears before the title opens."
              className="border-2 border-white/15 bg-black"
            />
          </div>
        </SurfacePanel>

        <AgeGateModal
          open={activeModal === "age"}
          onClose={() => setActiveModal(null)}
          onConfirm={handleAgeConfirm}
          ageRuleKey={ageRuleKey}
          legalAge={legalAge}
        />
      </main>
    </div>
  );
}
