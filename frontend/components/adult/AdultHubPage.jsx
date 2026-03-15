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
    trackEvent("adult_gate_blocked", { source: "adult-hub", reason: panelStatus });
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
        const adultSeries = (response.data?.series || []).filter((series) => series.adult);
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
            apiGet("/api/series?adult=1", { bust: true }).then((retryResponse) => {
              applyResponse(retryResponse);
            });
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
        .sort((left, right) => getPopularityScore(right) - getPopularityScore(left))
        .slice(0, 10)
        .map((series) => mapAdultItem(series, series.genres?.slice(0, 2).join(" | ") || "Adult pick")),
    [seriesList],
  );

  const completedItems = useMemo(
    () =>
      seriesList
        .filter((series) => String(series.status || "").toLowerCase() === "completed")
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
        hint: "Adult series available in the protected catalog.",
      },
      {
        label: "Completed",
        value: loading ? "--" : completedItems.length.toLocaleString(),
        hint: "Finished 18+ series ready for binge reading.",
      },
      {
        label: "Free unlocks",
        value: loading ? "--" : freeUnlockItems.length.toLocaleString(),
        hint: "Titles with active free-unlock value.",
      },
      {
        label: "Mode",
        value: isAdultMode ? "18+ enabled" : "Gate locked",
        hint: isAdultMode ? "Protected browsing is currently active." : "Sign in and confirm age to unlock this lane.",
      },
    ],
    [completedItems.length, freeUnlockItems.length, isAdultMode, loading, seriesList.length],
  );

  return (
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="After hours"
          title="A protected 18+ shelf should feel curated, not hidden behind a dead-end gate."
          description="This lane is reserved for mature readers and keeps premium discovery intact once access is confirmed."
          secondary="Unlock the gate, browse real titles, and jump straight into completed reads or free-unlock picks without switching storefronts."
          stats={adultStats}
          actions={
            isAdultMode ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/rankings?type=popular&window=week")}
                  className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  Open 18+ chart
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/rankings?type=ttf&window=all")}
                  className="rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
                >
                  Free unlock chart
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleGate}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Unlock 18+ access
              </button>
            )
          }
        />

        {showStale ? (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            Showing cached adult catalog data. Reconnect to refresh the live shelf.
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
          <SurfacePanel>
            <EmptyState
              icon="search"
              title="No adult titles are currently available"
              description="Try the weekly chart or switch back to the standard storefront until the protected shelf fills out."
              action={{
                label: "Open rankings",
                onClick: () => router.push("/rankings?type=popular&window=week"),
              }}
            />
          </SurfacePanel>
        ) : (
          <div className="space-y-6">
            <SurfacePanel>
              <Rail
                title="Adult Spotlight"
                items={spotlightItems}
                reason="The strongest-performing 18+ titles in the current protected catalog."
                href="/rankings?type=popular&window=week"
                ctaLabel="Open Chart"
                onItemClick={(item) => router.push(`/series/${item.seriesId || item.id}`)}
              />
            </SurfacePanel>

            {completedItems.length > 0 ? (
              <SurfacePanel>
                <Rail
                  title="Completed 18+ Picks"
                  items={completedItems}
                  reason="Finished mature series for readers who want a full binge lane."
                  href="/rankings?type=completed&window=all"
                  ctaLabel="View Completed"
                  onItemClick={(item) => router.push(`/series/${item.seriesId || item.id}`)}
                />
              </SurfacePanel>
            ) : null}

            {freeUnlockItems.length > 0 ? (
              <SurfacePanel>
                <Rail
                  title="Free Unlock After Dark"
                  items={freeUnlockItems}
                  reason="Adult titles with free unlock value that can delay a points purchase."
                  href="/rankings?type=ttf&window=all"
                  ctaLabel="View Free Unlocks"
                  onItemClick={(item) => router.push(`/series/${item.seriesId || item.id}`)}
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
