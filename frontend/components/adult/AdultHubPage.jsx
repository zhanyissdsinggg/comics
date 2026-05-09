"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoonStar, ShieldCheck, ToggleLeft } from "lucide-react";
import Rail from "../home/Rail";
import Skeleton from "../common/Skeleton";
import SurfacePanel from "../common/SurfacePanel";
import EmptyState from "../common/EmptyState";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import AdultGateBlockingPanel from "../series/AdultGateBlockingPanel";
import LoginGateModal from "../layout/LoginGateModal";
import AgeGateModal from "../layout/AgeGateModal";
import { trackEvent } from "../../lib/trackEvent";
import { apiGet } from "../../lib/apiClient";
import { useStaleNotice } from "../../hooks/useStaleNotice";
import { useRetryPolicy } from "../../hooks/useRetryPolicy";
import {
  LOGIN_GATE_DESCRIPTION,
  LOGIN_GATE_TITLE,
} from "../../lib/adultGateCopy";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPopularityScore(series) {
  return Math.max(
    toNumber(series.followers),
    toNumber(series.views),
    toNumber(series.ratingCount),
    Math.round(toNumber(series.rating) * 100),
  );
}

function mapAdultItem(series, subtitle, signal) {
  return {
    id: series.id,
    seriesId: series.id,
    title: series.title,
    subtitle,
    coverTone: series.coverTone,
    coverUrl: series.coverUrl,
    badge: "",
    genres: Array.isArray(series?.genres) ? series.genres : [],
    seriesType: series?.type || "",
    status: series?.status || "",
    statusLabel: signal,
  };
}

export default function AdultHubPage() {
  const router = useRouter();
  const {
    isAdultMode,
    requestAdultToggle,
    confirmAge,
    ageRuleKey,
    legalAge,
    requireLoginForAdult,
    adultConfirmed,
    forceDisableAdultMode,
  } = useAdultGateStore();
  const { isSignedIn, signIn } = useAuthStore();
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");
  const [seriesList, setSeriesList] = useState([]);
  const [seriesResponse, setSeriesResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const gateReportedRef = useRef(false);
  const showStale = useStaleNotice(seriesResponse);
  const { shouldRetry } = useRetryPolicy();

  const panelStatus =
    requireLoginForAdult && !isSignedIn
      ? "NEED_LOGIN"
      : adultConfirmed
        ? "OK"
        : "NEED_AGE_CONFIRM";

  const handleGate = () => {
    const wasAdultMode = isAdultMode;
    trackEvent("adult_toggle_attempt", { source: "adult-hub" });
    const status = requestAdultToggle(isSignedIn);
    if (status === "NEED_LOGIN") {
      setActiveModal("login");
      return;
    }
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    if (!wasAdultMode) {
      trackEvent("adult_gate_enabled", { source: "adult-hub" });
    }
    setActiveModal(null);
  };

  const handleLogin = async ({ email, password, mode }) => {
    trackEvent("adult_gate_login", { source: "adult-hub" });
    const response = await signIn(email, password, mode);
    if (response?.status === 202) {
      setAuthError("");
      return response;
    }
    if (!response.ok) {
      setAuthError("Invalid email or password.");
      return response;
    }
    const status = requestAdultToggle(true);
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return response;
    }
    setActiveModal(null);
    return response;
  };

  const handleAgeConfirm = async (ruleKey) => {
    trackEvent("adult_gate_confirm", { source: "adult-hub", ruleKey });
    await confirmAge(ruleKey);
    setActiveModal(null);
    trackEvent("adult_gate_enabled", { source: "adult-hub" });
  };

  useEffect(() => {
    trackEvent("view_adult", {});
  }, []);

  useEffect(() => {
    if (isAdultMode) {
      gateReportedRef.current = false;
      return;
    }
    if (gateReportedRef.current) {
      return;
    }
    trackEvent("adult_gate_blocked", {
      source: "adult-hub",
      reason: panelStatus,
    });
    gateReportedRef.current = true;
  }, [isAdultMode, panelStatus]);

  useEffect(() => {
    if (!isAdultMode || panelStatus !== "OK") {
      setSeriesList([]);
      setSeriesResponse(null);
      setLoading(false);
      return;
    }

    let retryTimer = null;
    setLoading(true);

    const applyResponse = (response) => {
      setSeriesResponse(response);
      if (response.ok) {
        const adultSeries = (response.data?.series || []).filter(
          (series) => series.adult,
        );
        setSeriesList(adultSeries);
        return true;
      }

      if (response.error === "ADULT_GATED") {
        forceDisableAdultMode();
        setSeriesList([]);
      }
      return false;
    };

    apiGet("/api/series?adult=1", { cacheMs: 30000 }).then((response) => {
      const applied = applyResponse(response);
      setLoading(false);

      if (applied && response.stale) {
        apiGet("/api/series?adult=1", {
          cacheMs: 30000,
          bust: true,
          dedupeMs: 0,
        }).then((freshResponse) => {
          applyResponse(freshResponse);
        });
        return;
      }

      if (!response.ok && (response.status === 0 || response.status >= 500)) {
        if (shouldRetry("adult_hub_series")) {
          retryTimer = setTimeout(() => {
            apiGet("/api/series?adult=1", { bust: true }).then(
              (retryResponse) => {
                applyResponse(retryResponse);
              },
            );
          }, 600);
        }
      }
    });

    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [forceDisableAdultMode, isAdultMode, panelStatus, shouldRetry]);

  const spotlightItems = useMemo(
    () =>
      [...seriesList]
        .sort(
          (left, right) => getPopularityScore(right) - getPopularityScore(left),
        )
        .slice(0, 10)
        .map((series) =>
          mapAdultItem(
            series,
            series.genres?.slice(0, 2).join(" / ") || "Mature title",
            "Hot this week",
          ),
        ),
    [seriesList],
  );

  const completedItems = useMemo(
    () =>
      seriesList
        .filter(
          (series) => String(series.status || "").toLowerCase() === "completed",
        )
        .slice(0, 10)
        .map((series) => mapAdultItem(series, "Completed", "Binge-worthy")),
    [seriesList],
  );

  const recentItems = useMemo(
    () =>
      [...seriesList]
        .sort(
          (left, right) =>
            Date.parse(right?.updatedAt || 0) - Date.parse(left?.updatedAt || 0),
        )
        .slice(0, 10)
        .map((series) => mapAdultItem(series, "Recently updated", "Fresh drop")),
    [seriesList],
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#09070c_0%,#120b13_42%,#0b0910_100%)] text-white">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_340px]">
          <SurfacePanel appearance="dark" tone="highlight" accent="rose" className="p-0">
            <div className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgba(244,201,93,0.72)]">
                    Private vault
                  </p>
                  <h1 className="max-w-[12ch] font-display text-[2.15rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-[2.9rem]">
                    Mature Mode On
                  </h1>
                </div>
                <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-[rgba(244,201,93,0.16)] bg-[rgba(244,201,93,0.08)] text-[rgba(244,201,93,0.92)] shadow-[0_14px_34px_rgba(8,6,20,0.24)]">
                  <MoonStar className="size-5" />
                </div>
              </div>

              <p className="mt-4 max-w-[40rem] text-sm leading-7 text-white/72 sm:text-[15px]">
                Mature titles stay isolated here. Public shelves, search, rankings, library views, and mobile navigation remain standard-content only.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    forceDisableAdultMode();
                    router.push("/mature-content");
                  }}
                  className={storefrontPrimaryButtonClass}
                >
                  Turn off Mature Mode
                </button>
                <Link href="/mature-content" className={storefrontSecondaryButtonClass}>
                  Mature content settings
                </Link>
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel appearance="dark" tone="muted" accent="cyan">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/56">
                Access status
              </p>
              <div className="space-y-3">
                <div className="rounded-[22px] border border-[rgba(244,201,93,0.12)] bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <ShieldCheck className="size-4 text-[rgba(244,201,93,0.92)]" />
                    18+ verified
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/64">
                    Access is active for this device while Mature Mode stays on.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <ToggleLeft className="size-4 text-[#ffd8e6]" />
                    Hidden from public surfaces
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/64">
                    Mature titles are not mixed into public search, recommendations, or the public library experience.
                  </p>
                </div>
              </div>
            </div>
          </SurfacePanel>
        </section>

        {showStale ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72 shadow-[0_12px_26px_rgba(8,6,20,0.2)]">
            Showing saved results while fresh data loads.
          </div>
        ) : null}

        {!isAdultMode ? (
          <AdultGateBlockingPanel
            status={panelStatus === "OK" ? "NEED_ADULT_MODE" : panelStatus}
            onOpenModal={handleGate}
          />
        ) : loading ? (
          <div className="space-y-6">
            <Skeleton className="h-44 w-full rounded-[28px]" />
            <Skeleton className="h-56 w-full rounded-[28px]" />
            <Skeleton className="h-56 w-full rounded-[28px]" />
          </div>
        ) : seriesList.length === 0 ? (
          <SurfacePanel appearance="dark" accent="blue">
            <EmptyState
              icon="search"
              title="No mature titles available."
              description="Check back later or review your settings."
              action={{
                label: "Open settings",
                onClick: () => router.push("/mature-content"),
              }}
              appearance="dark"
            />
          </SurfacePanel>
        ) : (
          <div className="space-y-6">
            <Rail
              eyebrow="Featured shelf"
              title="Hot this week"
              items={spotlightItems}
              reason="Mature titles that readers are opening most right now."
              href="/mature-content"
              ctaLabel="Settings"
              railName="adult"
              appearance="dark"
              onItemClick={(item) =>
                router.push(`/series/${item.seriesId || item.id}`)
              }
            />

            {recentItems.length > 0 ? (
              <Rail
                eyebrow="Recent updates"
                title="Fresh drops"
                items={recentItems}
                reason="New chapters and recent returns inside Mature Mode."
                railName="new"
                appearance="dark"
                onItemClick={(item) =>
                  router.push(`/series/${item.seriesId || item.id}`)
                }
              />
            ) : null}

            {completedItems.length > 0 ? (
              <Rail
                eyebrow="Completed shelf"
                title="Binge-worthy"
                items={completedItems}
                reason="Finished mature series when you want a full run."
                railName="completed"
                appearance="dark"
                onItemClick={(item) =>
                  router.push(`/series/${item.seriesId || item.id}`)
                }
              />
            ) : null}
          </div>
        )}
      </div>

      <LoginGateModal
        open={activeModal === "login"}
        onClose={() => {
          setActiveModal(null);
          setAuthError("");
        }}
        onSubmit={handleLogin}
        title={LOGIN_GATE_TITLE}
        description={LOGIN_GATE_DESCRIPTION}
        errorMessage={authError}
      />
      <AgeGateModal
        open={activeModal === "age"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleAgeConfirm}
        ageRuleKey={ageRuleKey}
        legalAge={legalAge}
      />
    </main>
  );
}
