"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const maturityStatus = useMemo(() => {
    if (!viewerSignedIn) {
      return {
        label: "Signed out",
        description: "Sign in to manage mature access on this device.",
      };
    }
    if (!adultConfirmed) {
      return {
        label: "Need age verification",
        description: `Current regional requirement: ${regionConfig.legalAge}+.`,
      };
    }
    if (isAdultMode) {
      return {
        label: "Mature Mode On",
        description:
          "Mature titles can be opened from the separate mature catalog.",
      };
    }
    return {
      label: "Hidden",
      description:
        "Mature titles stay hidden until you turn Mature Mode back on.",
    };
  }, [adultConfirmed, isAdultMode, regionConfig.legalAge, viewerSignedIn]);

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
          ? "Mature Mode is now off on this device."
          : "Mature Mode is now on for this device.",
      );
    }
  }, [isAdultMode, openAuthPrompt, requestAdultToggle, viewerSignedIn]);

  const handleAgeConfirm = useCallback(async () => {
    await confirmAge(ageRuleKey);
    setActiveModal(null);
    setFeedback(
      "Age verification saved. Mature Mode is now on for this device.",
    );
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
      const response = await apiPost("/api/preferences", {
        preferences: {
          hideAdultHistory: nextValue,
        },
      });
      if (response.ok) {
        setFeedback("Mature history preference saved.");
      } else {
        setFeedback(response.error || "Couldn't save that setting.");
      }
      setSaving(false);
    },
    [viewerSignedIn],
  );

  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#120f1c_0%,#0d0b14_100%)] text-white">
      <main className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_340px]">
          <SurfacePanel appearance="dark" tone="highlight" accent="rose">
            <StorefrontSectionHeading
              eyebrow="Mature content settings"
              title="Control 18+ access on this device"
              description="Mature titles remain separate from the public storefront. Use these settings to manage visibility, age verification, and mature reading history."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StorefrontInfoCard
                title={maturityStatus.label}
                description={maturityStatus.description}
              />
              <StorefrontInfoCard
                title={`${regionConfig.legalAge}+ rule`}
                description={`Current region: ${regionConfig.label}.`}
              />
              <StorefrontInfoCard
                title={hideAdultHistory ? "History hidden" : "History visible"}
                description="This only affects mature reading history on the current device."
              />
            </div>
          </SurfacePanel>

          <SurfacePanel appearance="dark" tone="muted" accent="cyan">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/56">
                Quick actions
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleMatureVisibility}
                  className={storefrontPrimaryButtonClass}
                >
                  {!viewerSignedIn
                    ? "Sign in to manage Mature Mode"
                    : !adultConfirmed
                      ? "Verify age for Mature Mode"
                      : isAdultMode
                        ? "Turn off Mature Mode"
                        : "Turn on Mature Mode"}
                </button>
                <Link href="/adult" className={storefrontSecondaryButtonClass}>
                  Open mature catalog
                </Link>
              </div>
              <p className="text-sm leading-6 text-white/62">
                Normal mode shows normal content only. Adult mode switches home,
                search, rankings, library, and reader to adult-only content, and
                the two modes stay mutually exclusive.
              </p>
            </div>
          </SurfacePanel>
        </section>

        {feedback ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/74 shadow-[0_12px_26px_rgba(8,6,20,0.2)]">
            {feedback}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SurfacePanel appearance="dark" tone="muted" accent="blue">
            <StorefrontSectionHeading
              eyebrow="Visibility"
              title="Current mature visibility"
              description="Signed-out visitors and readers without age verification cannot open mature titles. Even verified readers still need Mature Mode turned on."
            />

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
                Current status
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
                {maturityStatus.label}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/64">
                {maturityStatus.description}
              </p>
            </div>
          </SurfacePanel>

          <SurfacePanel appearance="dark" tone="muted" accent="blue">
            <StorefrontSectionHeading
              eyebrow="History"
              title="Hide mature reading history on this device"
              description="This keeps mature reading history separate from the standard library view on the current device."
            />

            <label className="mt-5 flex items-start gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/78 shadow-[0_12px_26px_rgba(8,6,20,0.18)]">
              <input
                type="checkbox"
                checked={hideAdultHistory}
                onChange={(event) =>
                  handleHideHistoryChange(event.target.checked)
                }
                disabled={saving}
                className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-[#8be9f6] focus:ring-0"
              />
              <span>Hide mature reading history on this device</span>
            </label>
          </SurfacePanel>
        </div>

        <SurfacePanel appearance="dark" tone="muted" accent="cyan">
          <StorefrontSectionHeading
            eyebrow="Support"
            title="Need help with mature access?"
            description="If Mature Mode gets stuck, use the support topic below so we can point you to the right policy or access flow."
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={buildSupportPath({
                topic: "adult",
                context: "Mature content access help",
              })}
              className={storefrontSecondaryButtonClass}
            >
              Contact support
            </Link>
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
