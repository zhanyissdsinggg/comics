"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import Rail from "../home/Rail";
import Skeleton from "../common/Skeleton";
import EditorialHero from "../common/EditorialHero";
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

function mapAdultItem(series, subtitle) {
  return {
    id: series.id,
    seriesId: series.id,
    title: series.title,
    subtitle,
    coverTone: series.coverTone,
    coverUrl: series.coverUrl,
    badge: series.badge || "18+",
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
      return;
    }
    const status = requestAdultToggle(true);
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    setActiveModal(null);
    return response;
  };

  const handleAgeConfirm = (ruleKey) => {
    trackEvent("adult_gate_confirm", { source: "adult-hub", ruleKey });
    confirmAge(ruleKey);
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
    if (!isAdultMode) {
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
  }, [forceDisableAdultMode, isAdultMode, shouldRetry]);

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
            series.genres?.slice(0, 2).join(" | ") || "Adult pick",
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
        .map((series) => mapAdultItem(series, "Completed")),
    [seriesList],
  );

  const freeUnlockItems = useMemo(
    () =>
      seriesList
        .filter((series) => series.ttf?.enabled)
        .slice(0, 10)
        .map((series) => mapAdultItem(series, "Free unlocks available")),
    [seriesList],
  );

  const adultStats = useMemo(
    () => [
      {
        label: "Titles",
        value: loading ? "--" : seriesList.length.toLocaleString(),
      },
      {
        label: "Completed",
        value: loading ? "--" : completedItems.length.toLocaleString(),
      },
      {
        label: "Free unlocks",
        value: loading ? "--" : freeUnlockItems.length.toLocaleString(),
      },
      {
        label: "Mode",
        value: isAdultMode ? "18+ enabled" : "Gate locked",
      },
    ],
    [
      completedItems.length,
      freeUnlockItems.length,
      isAdultMode,
      loading,
      seriesList.length,
    ],
  );
  const adultModeActionLabel = isAdultMode ? "18+ is on." : "18+ is off.";
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-[#f8f9fc]";

  return (
    <main className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <div className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            eyebrow="18+ catalog"
            title="18+ shelf."
            description="Private by default."
            secondary={
              isAdultMode ? "Access is on." : "Sign in and confirm access."
            }
            stats={adultStats}
            accent="amber"
            appearance="light"
          />

          <SurfacePanel
            tone="muted"
            accent="amber"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Access
              </p>
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  {adultModeActionLabel}
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {isAdultMode ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      router.push("/rankings?type=popular&window=week")
                    }
                    className={primaryButtonClass}
                  >
                    Top series
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/rankings?type=ttf&window=all")}
                    className={secondaryButtonClass}
                  >
                    Free unlocks
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleGate}
                  className={primaryButtonClass}
                >
                  Unlock 18+ access
                </button>
              )}
            </div>
          </SurfacePanel>
        </section>

        {showStale ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Showing cached 18+ catalog data. Reconnect to refresh the latest
            titles.
          </div>
        ) : null}

        {!isAdultMode ? (
          <AdultGateBlockingPanel
            status={panelStatus === "OK" ? "NEED_AGE_CONFIRM" : panelStatus}
            onOpenModal={handleGate}
          />
        ) : loading ? (
          <div className="space-y-6">
            <Skeleton className="h-44 w-full rounded-[28px]" />
            <Skeleton className="h-56 w-full rounded-[28px]" />
            <Skeleton className="h-56 w-full rounded-[28px]" />
          </div>
        ) : seriesList.length === 0 ? (
          <SurfacePanel appearance="light" accent="blue">
            <EmptyState
              icon="search"
              title="No adult titles are currently available"
              description="Check back later or browse the standard catalog."
              action={{
                label: "Open Top Series",
                onClick: () =>
                  router.push("/rankings?type=popular&window=week"),
              }}
              appearance="light"
            />
          </SurfacePanel>
        ) : (
          <div className="space-y-6">
            <SurfacePanel appearance="light" accent="blue">
              <Rail
                title="18+ Spotlight"
                items={spotlightItems}
                reason="Start here."
                href="/rankings?type=popular&window=week"
                ctaLabel="Open Top Series"
                appearance="light"
                onItemClick={(item) =>
                  router.push(`/series/${item.seriesId || item.id}`)
                }
              />
            </SurfacePanel>

            {completedItems.length > 0 ? (
              <SurfacePanel appearance="light" accent="blue">
                <Rail
                  title="Completed 18+ Series"
                  items={completedItems}
                  reason="Finished stories."
                  href="/rankings?type=completed&window=all"
                  ctaLabel="Browse completed"
                  appearance="light"
                  onItemClick={(item) =>
                    router.push(`/series/${item.seriesId || item.id}`)
                  }
                />
              </SurfacePanel>
            ) : null}

            {freeUnlockItems.length > 0 ? (
              <SurfacePanel appearance="light" accent="blue">
                <Rail
                  title="Free Unlock 18+ Picks"
                  items={freeUnlockItems}
                  reason="Free unlocks."
                  href="/rankings?type=ttf&window=all"
                  ctaLabel="See free unlocks"
                  appearance="light"
                  onItemClick={(item) =>
                    router.push(`/series/${item.seriesId || item.id}`)
                  }
                />
              </SurfacePanel>
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
