"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { track } from "../../lib/analytics";

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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gateStatus, setGateStatus] = useState("OK");
  const [activeModal, setActiveModal] = useState(null);
  const [adultState, setAdultState] = useState(readAdultState());
  const [actionModal, setActionModal] = useState(null);
  const series = data?.series || {};
  const episodes = Array.isArray(data?.episodes) ? data.episodes : [];
  const entitlement = data?.entitlement || {};
  const wallet = data?.wallet || {};
  const firstEpisodeId = useMemo(
    () => getFirstEpisodeId(episodes),
    [episodes]
  );
  const [lastReadEpisodeId, setLastReadEpisodeId] = useState(null);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const adultFlag = adultState.isAdultMode ? "1" : "0";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const url = `${baseUrl}/api/series/${seriesId}?adult=${adultFlag}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 403) {
          setError("ADULT_GATED");
        } else {
          setError("FETCH_ERROR");
        }
        setLoading(false);
        return;
      }

      const payload = await response.json();
      if (payload?.error === "ADULT_GATED") {
        setError("ADULT_GATED");
        setLoading(false);
        return;
      }

      setData(payload);
      setLoading(false);
    } catch (err) {
      setError("FETCH_ERROR");
      setLoading(false);
    }
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
    }
  }, [data?.series?.id]);

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

  const openActionModal = (type, episodeId) => {
    const episode = episodes.find((item) => item.id === episodeId);
    const title =
      type === "unlock" ? "Unlock (P0-1)" : "Claim Free (P0-1)";
    const description =
      type === "unlock"
        ? `Unlock ${episode?.title} will be available in P0-2.`
        : `Claim free for ${episode?.title} will be available in P0-2.`;
    setActionModal({ title, description });
  };

  const handleRead = (seriesIdValue, episodeId) => {
    track("click_episode_read", { seriesId: seriesIdValue, episodeId });
    window.location.href = `/read/${seriesIdValue}/${episodeId}`;
  };

  const handleUnlock = (seriesIdValue, episodeId) => {
    track("click_episode_unlock", { seriesId: seriesIdValue, episodeId });
    openActionModal("unlock", episodeId);
  };

  const handleClaim = (seriesIdValue, episodeId) => {
    track("click_episode_claim", { seriesId: seriesIdValue, episodeId });
    openActionModal("claim", episodeId);
  };

  const handleSubscribe = (seriesIdValue, episodeId) => {
    track("click_subscribe_from_ttf", { seriesId: seriesIdValue, episodeId });
    window.location.href = "/subscribe";
  };

  const handleContinue = lastReadEpisodeId
    ? () => handleRead(seriesId, lastReadEpisodeId)
    : null;
  const handleStart = !lastReadEpisodeId && firstEpisodeId
    ? () => handleRead(seriesId, firstEpisodeId)
    : null;

  const handleFollow = () => {
    setActionModal({
      title: "Follow (P0-1)",
      description: "Follow will be available in P0-2.",
    });
  };

  const handleAddToLibrary = () => {
    setActionModal({
      title: "Add to Library (P0-1)",
      description: "Add to Library will be available in P0-2.",
    });
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
          wallet={wallet}
          onContinue={handleContinue}
          onStart={handleStart}
          onFollow={handleFollow}
          onAddToLibrary={handleAddToLibrary}
        />

        <div className="lg:grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <EpisodeList
              series={series}
              episodes={episodes}
              entitlement={entitlement}
              onRead={handleRead}
              onUnlock={handleUnlock}
              onClaim={handleClaim}
              onSubscribe={handleSubscribe}
            />
          </div>
          <div className="lg:col-span-4">
            <WalletCard wallet={wallet} />
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
        open={Boolean(actionModal)}
        title={actionModal?.title}
        description={actionModal?.description}
        onClose={() => setActionModal(null)}
      />
    </main>
  );
}
