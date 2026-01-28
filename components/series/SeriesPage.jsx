"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SeriesHeader from "./SeriesHeader";
import EpisodeList from "./EpisodeList";
import AdultGateBlockingPanel from "./AdultGateBlockingPanel";
import AdultLoginModal from "./AdultLoginModal";
import AdultAgeModal from "./AdultAgeModal";
import ActionModal from "./ActionModal";
import SiteHeader from "../layout/SiteHeader";
import {
  confirmAge,
  mockSignIn,
  readAdultState,
  requestEnableAdult,
} from "../../lib/adultGate";
import { apiGet } from "../../lib/apiClient";
import { track } from "../../lib/analytics";
import { useWalletStore } from "../../store/useWalletStore";
import { useEntitlementStore } from "../../store/useEntitlementStore";
import { useRewardsStore } from "../../store/useRewardsStore";
import { useFollowStore } from "../../store/useFollowStore";

function getFirstEpisodeId(episodes) {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    return null;
  }
  const sorted = [...episodes].sort((a, b) => {
    const aNum = a?.number ?? 0;
    const bNum = b?.number ?? 0;
    return aNum - bNum;
  });
  return sorted[0]?.id || null;
}

function WalletCard({ wallet }) {
  const paidPts = wallet?.paidPts || 0;
  const bonusPts = wallet?.bonusPts || 0;
  const subscription = wallet?.subscription || {};
  const totalPts = paidPts + bonusPts;

  return (
    <aside className="wallet-card">
      <div className="wallet-card-header">
        <h3>Wallet</h3>
        <span>Total: {totalPts} PTS</span>
      </div>
      <div className="wallet-card-body">
        <div>Paid: {paidPts}</div>
        <div>Bonus: {bonusPts}</div>
        <div>Subscription: {subscription.active ? "Active" : "Inactive"}</div>
        {subscription.active ? (
          <div>Renews: {subscription.renewAt}</div>
        ) : null}
      </div>
    </aside>
  );
}

export default function SeriesPage({ seriesId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gateStatus, setGateStatus] = useState("OK");
  const [activeModal, setActiveModal] = useState(null);
  const [adultState, setAdultState] = useState(readAdultState());
  const [infoModal, setInfoModal] = useState(null);

  const walletStore = useWalletStore();
  const { loadWallet } = walletStore;
  const { bySeriesId, loadEntitlement, unlockEpisode, claimTTF } =
    useEntitlementStore();
  const { report } = useRewardsStore();
  const { followedSeriesIds, loadFollowed, follow, unfollow } = useFollowStore();

  const series = data?.series || {};
  const episodes = Array.isArray(data?.episodes) ? data.episodes : [];
  const entitlement = bySeriesId[seriesId] || { seriesId, unlockedEpisodeIds: [] };
  const firstEpisodeId = useMemo(
    () => getFirstEpisodeId(episodes),
    [episodes]
  );
  const [lastReadEpisodeId, setLastReadEpisodeId] = useState(null);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const adultFlag = adultState.isAdultMode ? "1" : "0";
    const response = await apiGet(`/api/series/${seriesId}?adult=${adultFlag}`);

    if (!response.ok) {
      if (response.status === 403 || response.error === "ADULT_GATED") {
        setError("ADULT_GATED");
      } else {
        setError("FETCH_ERROR");
      }
      setLoading(false);
      return;
    }

    if (response.data?.error === "ADULT_GATED") {
      setError("ADULT_GATED");
      setLoading(false);
      return;
    }

    setData(response.data);
    setLoading(false);
  }, [adultState.isAdultMode, seriesId]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  useEffect(() => {
    if (seriesId && typeof window !== "undefined") {
      const key = `mn_progress_${seriesId}`;
      const value = window.localStorage.getItem(key);
      setLastReadEpisodeId(value);
    }
  }, [seriesId, data?.series?.id]);

  useEffect(() => {
    if (data?.series?.id) {
      track("view_series", { seriesId: data.series.id });
      loadWallet();
      loadEntitlement(data.series.id);
      loadFollowed();
    }
  }, [data?.series?.id, loadEntitlement, loadWallet, loadFollowed]);

  useEffect(() => {
    if (error === "ADULT_GATED" || series?.adult) {
      setGateStatus(requestEnableAdult());
      return;
    }
    setGateStatus("OK");
  }, [error, series?.adult, adultState.isAdultMode]);

  const openGateModal = () => {
    const status = requestEnableAdult();
    setGateStatus(status);
    if (status === "NEED_LOGIN") {
      setActiveModal("login");
      return;
    }
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    setActiveModal(null);
    fetchSeries();
  };

  const handleLogin = () => {
    mockSignIn();
    setAdultState(readAdultState());
    setActiveModal(null);
    openGateModal();
  };

  const handleAgeConfirm = () => {
    confirmAge();
    setAdultState(readAdultState());
    setActiveModal(null);
    setGateStatus("OK");
    fetchSeries();
  };

  const handleRead = (seriesIdValue, episodeId) => {
    track("click_episode_read", { seriesId: seriesIdValue, episodeId });
    router.push(`/read/${seriesIdValue}/${episodeId}`);
  };

  const handleUnlock = (seriesIdValue, episodeId, idempotencyKey) => {
    return unlockEpisode(seriesIdValue, episodeId, idempotencyKey);
  };

  const handleClaim = (seriesIdValue, episodeId) => {
    return claimTTF(seriesIdValue, episodeId);
  };

  const handleSubscribe = (seriesIdValue, episodeId) => {
    track("click_subscribe_from_ttf", { seriesId: seriesIdValue, episodeId });
    router.push("/subscribe");
  };

  const handleContinue = lastReadEpisodeId
    ? () => handleRead(seriesId, lastReadEpisodeId)
    : null;
  const handleStart = !lastReadEpisodeId && firstEpisodeId
    ? () => handleRead(seriesId, firstEpisodeId)
    : null;

  const isFollowing = followedSeriesIds.includes(seriesId);

  const handleFollowToggle = async () => {
    if (isFollowing) {
      await unfollow(seriesId);
      return;
    }
    await follow(seriesId);
    report("FOLLOW_SERIES");
  };

  const handleAddToLibrary = () => {
    setInfoModal({
      type: "INFO",
      title: "Add to Library",
      description: "Add to Library will be available in P0-2.",
    });
  };

  const handleShare = () => {
    setInfoModal({
      type: "INFO",
      title: "Share",
      description: "Share will be available in P0-2.",
    });
    report("SHARE_SERIES");
  };

  if (loading) {
    return (
      <main className="series-page">
        <SiteHeader />
        <div className="max-w-6xl mx-auto px-4">
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  if (error && error !== "ADULT_GATED") {
    return (
      <main className="series-page">
        <SiteHeader />
        <div className="max-w-6xl mx-auto px-4">
          <p>Failed to load series.</p>
        </div>
      </main>
    );
  }

  if ((series?.adult || error === "ADULT_GATED") && gateStatus !== "OK") {
    return (
      <main className="series-page">
        <SiteHeader />

        <AdultGateBlockingPanel status={gateStatus} onOpenModal={openGateModal} />
        <AdultLoginModal
          open={activeModal === "login"}
          onClose={() => setActiveModal(null)}
          onConfirm={handleLogin}
        />
        <AdultAgeModal
          open={activeModal === "age"}
          onClose={() => setActiveModal(null)}
          onConfirm={handleAgeConfirm}
          ageRuleKey={adultState.ageRuleKey}
          legalAge={adultState.legalAge}
        />
      </main>
    );
  }

  return (
    <main className="series-page">
      <SiteHeader />

      <div className="max-w-6xl mx-auto px-4">
        <SeriesHeader
          series={series}
          wallet={walletStore}
          onContinue={handleContinue}
          onStart={handleStart}
          onFollowToggle={handleFollowToggle}
          isFollowing={isFollowing}
          onAddToLibrary={handleAddToLibrary}
          onShare={handleShare}
        />

        <div className="lg:grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <EpisodeList
              series={series}
              episodes={episodes}
              entitlement={entitlement}
              wallet={walletStore}
              onRead={handleRead}
              onUnlock={handleUnlock}
              onClaim={handleClaim}
              onSubscribe={handleSubscribe}
            />
          </div>
          <div className="lg:col-span-4">
            <WalletCard wallet={walletStore} />
          </div>
        </div>
      </div>

      <AdultLoginModal
        open={activeModal === "login"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleLogin}
      />
      <AdultAgeModal
        open={activeModal === "age"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleAgeConfirm}
        ageRuleKey={adultState.ageRuleKey}
        legalAge={adultState.legalAge}
      />
      <ActionModal
        open={Boolean(infoModal)}
        type={infoModal?.type}
        title={infoModal?.title}
        description={infoModal?.description}
        onClose={() => setInfoModal(null)}
      />
    </main>
  );
}
