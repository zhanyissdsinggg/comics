"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "../../lib/apiClient";
import { track } from "../../lib/analytics";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { useWalletStore } from "../../store/useWalletStore";
import PageStream from "./PageStream";
import ReaderTopBar from "./ReaderTopBar";
import EndOfEpisodeOverlay from "./EndOfEpisodeOverlay";
import ActionModal from "../series/ActionModal";
import { useProgressStore } from "../../store/useProgressStore";
import { useRewardsStore } from "../../store/useRewardsStore";

function getEpisodeIndex(episodes, episodeId) {
  return episodes.findIndex((episode) => episode.id === episodeId);
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export default function ReaderPage({ seriesId, episodeId }) {
  const router = useRouter();
  const [episodeData, setEpisodeData] = useState(null);
  const [seriesData, setSeriesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [modalState, setModalState] = useState(null);
  const previewEndRef = useRef(null);
  const endRef = useRef(null);
  const scrollRef = useRef(0);
  const progressTimerRef = useRef(null);

  const { bySeriesId, loadEntitlement, unlockEpisode, claimTTF } =
    useEntitlementStore();
  const { loadWallet, topup } = useWalletStore();
  const { setProgress } = useProgressStore();
  const { report } = useRewardsStore();
  const reportedRef = useRef(false);

  const entitlement = bySeriesId[seriesId] || { unlockedEpisodeIds: [] };
  const unlocked = entitlement.unlockedEpisodeIds.includes(episodeId);
  const episodes = seriesData?.episodes || [];
  const currentIndex = getEpisodeIndex(episodes, episodeId);
  const nextEpisode = currentIndex >= 0 ? episodes[currentIndex + 1] : null;
  const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextUnlocked = nextEpisode
    ? entitlement.unlockedEpisodeIds.includes(nextEpisode.id)
    : false;

  const previewCount = useMemo(() => {
    if (unlocked) {
      return null;
    }
    return episodeData?.previewFreePages ?? 3;
  }, [episodeData?.previewFreePages, unlocked]);

  const previewParagraphs = useMemo(() => {
    if (unlocked) {
      return null;
    }
    return episodeData?.previewParagraphs ?? 3;
  }, [episodeData?.previewParagraphs, unlocked]);

  const fetchEpisode = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [episodeResponse, seriesResponse] = await Promise.all([
      apiGet(`/api/episode?seriesId=${seriesId}&episodeId=${episodeId}`),
      apiGet(`/api/series/${seriesId}?adult=1`),
    ]);

    if (!episodeResponse.ok) {
      setError("EPISODE_ERROR");
      setLoading(false);
      return;
    }
    if (!seriesResponse.ok) {
      setError("SERIES_ERROR");
      setLoading(false);
      return;
    }
    setEpisodeData(episodeResponse.data?.episode);
    setSeriesData(seriesResponse.data);
    setLoading(false);
  }, [episodeId, seriesId]);

  useEffect(() => {
    fetchEpisode();
  }, [fetchEpisode]);

  useEffect(() => {
    loadWallet();
    loadEntitlement(seriesId);
  }, [loadEntitlement, loadWallet, seriesId]);

  useEffect(() => {
    if (episodeData?.id) {
      track("view_reader", { seriesId, episodeId });
    }
  }, [episodeData?.id, episodeId, seriesId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === endRef.current) {
            setShowEndOverlay(entry.isIntersecting);
          }
          if (entry.target === previewEndRef.current) {
            if (entry.isIntersecting && !unlocked) {
              setShowPaywall(true);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    if (endRef.current) {
      observer.observe(endRef.current);
    }
    if (previewEndRef.current) {
      observer.observe(previewEndRef.current);
    }

    return () => observer.disconnect();
  }, [unlocked]);

  useEffect(() => {
    if (showEndOverlay && !reportedRef.current) {
      report("READ_EPISODE");
      reportedRef.current = true;
    }
  }, [report, showEndOverlay]);

  useEffect(() => {
    reportedRef.current = false;
  }, [episodeId]);

  useEffect(() => {
    const onScroll = () => {
      const total =
        document.documentElement.scrollHeight - window.innerHeight;
      const percent = total > 0 ? window.scrollY / total : 0;
      scrollRef.current = Math.min(1, Math.max(0, percent));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    progressTimerRef.current = setInterval(() => {
      setProgress(seriesId, episodeId, scrollRef.current);
    }, 2000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      setProgress(seriesId, episodeId, scrollRef.current);
    };
  }, [episodeId, seriesId, setProgress]);

  const handleUnlock = async (targetEpisodeId) => {
    const response = await unlockEpisode(
      seriesId,
      targetEpisodeId,
      createIdempotencyKey()
    );
    if (response.ok) {
      setShowPaywall(false);
    }
    return response;
  };

  const handleClaim = async (targetEpisodeId) => {
    const response = await claimTTF(seriesId, targetEpisodeId);
    return response;
  };

  const handleShortfall = (response, targetEpisodeId) => {
    setModalState({
      type: "SHORTFALL",
      title: "Not enough points",
      description: "Not enough points to unlock this episode.",
      shortfallPts: response.shortfallPts || 0,
      targetEpisodeId,
    });
  };

  const handleUnlockCurrent = async () => {
    const response = await handleUnlock(episodeId);
    if (response.ok) {
      setModalState({
        type: "SUCCESS",
        title: "Unlocked",
        description: "Episode unlocked successfully.",
      });
      return;
    }
    if (response.status === 402) {
      handleShortfall(response, episodeId);
      return;
    }
    track("unlock_fail", {
      seriesId,
      episodeId,
      status: response.status,
      errorCode: response.error,
      requestId: response.requestId,
    });
    setModalState({
      type: "ERROR",
      title: "Unlock failed",
      description: response.error || "Please try again.",
    });
  };

  const handleUnlockNext = async () => {
    if (!nextEpisode) {
      return;
    }
    const response = await handleUnlock(nextEpisode.id);
    if (response.ok) {
      router.push(`/read/${seriesId}/${nextEpisode.id}`);
      return;
    }
    if (response.status === 402) {
      handleShortfall(response, nextEpisode.id);
      return;
    }
    track("unlock_fail", {
      seriesId,
      episodeId: nextEpisode.id,
      status: response.status,
      errorCode: response.error,
      requestId: response.requestId,
    });
    setModalState({
      type: "ERROR",
      title: "Unlock failed",
      description: response.error || "Please try again.",
    });
  };

  const handleClaimNext = async () => {
    if (!nextEpisode) {
      return;
    }
    const response = await handleClaim(nextEpisode.id);
    if (response.ok) {
      router.push(`/read/${seriesId}/${nextEpisode.id}`);
      return;
    }
    setModalState({
      type: "ERROR",
      title: "Claim failed",
      description: response.error || "TTF not ready.",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <ReaderTopBar
          title="Loading..."
          episodeLabel="..."
          onBack={() => router.push(`/series/${seriesId}`)}
        />
        <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-400">
          Loading episode...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100">
        <ReaderTopBar
          title="Error"
          episodeLabel="..."
          onBack={() => router.push(`/series/${seriesId}`)}
        />
        <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-400">
          Failed to load episode.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <ReaderTopBar
        title={seriesData?.series?.title || "Series"}
        episodeLabel={episodeData?.title || episodeId}
        onBack={() => router.push(`/series/${seriesId}`)}
        onPrev={() =>
          prevEpisode
            ? router.push(`/read/${seriesId}/${prevEpisode.id}`)
            : null
        }
        onNext={() => {
          if (!nextEpisode) {
            return;
          }
          if (nextUnlocked) {
            router.push(`/read/${seriesId}/${nextEpisode.id}`);
            return;
          }
          setShowEndOverlay(true);
        }}
        nextLocked={nextEpisode ? !nextUnlocked : false}
      />

      <PageStream
        pages={episodeData?.pages || []}
        paragraphs={episodeData?.paragraphs || []}
        previewCount={previewCount}
        previewParagraphs={previewParagraphs}
        onPreviewEndRef={previewEndRef}
        onEndRef={endRef}
      />

      {showPaywall ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/95 p-6 text-center">
            <h2 className="text-xl font-semibold">Unlock this episode</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Continue reading by unlocking this chapter.
            </p>
            <button
              type="button"
              onClick={handleUnlockCurrent}
              className="mt-6 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
            >
              Unlock ({episodeData?.pricePts} PTS)
            </button>
          </div>
        </div>
      ) : null}

      <EndOfEpisodeOverlay
        open={showEndOverlay}
        nextEpisode={nextEpisode}
        nextUnlocked={nextUnlocked}
        onNext={() => router.push(`/read/${seriesId}/${nextEpisode?.id}`)}
        onUnlock={handleUnlockNext}
        onSubscribe={() => router.push("/subscribe")}
        onClaim={handleClaimNext}
        onNotify={() =>
          setModalState({
            type: "INFO",
            title: "Notify me",
            description: "We will notify you when it's ready.",
          })
        }
      />

      <ActionModal
        open={Boolean(modalState)}
        type={modalState?.type}
        title={modalState?.title}
        description={modalState?.description}
        shortfallPts={modalState?.shortfallPts}
        actions={
          modalState?.type === "SHORTFALL"
            ? [
                {
                  label: "Go to Store",
                  onClick: () => {
                    router.push(
                      `/store?returnTo=/read/${seriesId}/${episodeId}&focus=starter`
                    );
                    setModalState(null);
                  },
                  variant: "secondary",
                },
                {
                  label: "Quick Topup",
                  onClick: async () => {
                    const topupResponse = await topup("starter");
                    if (topupResponse.ok) {
                      const retryId = modalState?.targetEpisodeId || episodeId;
                      const retry = await handleUnlock(retryId);
                      if (retry.ok && nextEpisode && retryId === nextEpisode.id) {
                        router.push(`/read/${seriesId}/${nextEpisode.id}`);
                        return;
                      }
                      setModalState({
                        type: "SUCCESS",
                        title: "Unlocked",
                        description: "Episode unlocked successfully.",
                      });
                      return;
                    }
                    setModalState({
                      type: "ERROR",
                      title: "Topup failed",
                      description: "Unable to top up and unlock.",
                    });
                  },
                  variant: "primary",
                },
              ]
            : null
        }
        onClose={() => setModalState(null)}
      />
    </main>
  );
}
