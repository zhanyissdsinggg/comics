"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import ReadingStats from "../../components/account/ReadingStats";
import { LANGUAGE_OPTIONS, REGION_KEYS, getRegionConfig } from "../../lib/region/config";
import { setCookie } from "../../lib/cookies";
import { applyPreferencesToStorage } from "../../lib/preferencesClient";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { apiGet, apiPost } from "../../lib/apiClient";

const REGION_KEY = "mn_region";
const LANG_KEY = "mn_lang";
const HIDE_ADULT_KEY = "mn_hide_adult_history";
const DISPLAY_NAME_KEY = "mn_display_name";
const NOTIFY_NEW_KEY = "mn_notify_new_episode";
const NOTIFY_TTF_KEY = "mn_notify_ttf_ready";
const NOTIFY_PROMO_KEY = "mn_notify_promo";

function readStorage(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }
  return window.localStorage.getItem(key) || fallback;
}

export default function AccountPage() {
  const router = useRouter();
  const { isSignedIn, user } = useAuthStore();
  const { plan, subscription, loadWallet, cancelSubscription } = useWalletStore();
  const [region, setRegion] = useState("global");
  const [language, setLanguage] = useState("zh");
  const [hideAdultHistory, setHideAdultHistory] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [notifyNew, setNotifyNew] = useState(true);
  const [notifyTtf, setNotifyTtf] = useState(true);
  const [notifyPromo, setNotifyPromo] = useState(true);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [verifyStatus, setVerifyStatus] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetStatus, setResetStatus] = useState("");

  useEffect(() => {
    const storedRegion = readStorage(REGION_KEY, "global");
    const storedLang = readStorage(LANG_KEY, "zh");
    const storedHide = readStorage(HIDE_ADULT_KEY, "0") === "1";
    const storedName = readStorage(DISPLAY_NAME_KEY, "");
    const storedNotifyNew = readStorage(NOTIFY_NEW_KEY, "1") !== "0";
    const storedNotifyTtf = readStorage(NOTIFY_TTF_KEY, "1") !== "0";
    const storedNotifyPromo = readStorage(NOTIFY_PROMO_KEY, "1") !== "0";
    setRegion(storedRegion);
    setLanguage(storedLang);
    setHideAdultHistory(storedHide);
    setDisplayName(storedName);
    setNotifyNew(storedNotifyNew);
    setNotifyTtf(storedNotifyTtf);
    setNotifyPromo(storedNotifyPromo);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const verifyParam = params.get("verifyToken");
      const resetParam = params.get("resetToken");
      if (verifyParam) {
        setVerifyToken(verifyParam);
      }
      if (resetParam) {
        setResetToken(resetParam);
      }
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      loadWallet();
    }
  }, [isSignedIn, loadWallet]);

  useEffect(() => {
    let mounted = true;
    if (!isSignedIn) {
      setOrders([]);
      setOrdersLoading(false);
      return () => {
        mounted = false;
      };
    }
    apiGet("/api/preferences").then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok && response.data?.preferences) {
        const prefs = response.data.preferences;
        if (typeof prefs.notifyNewEpisode === "boolean") {
          setNotifyNew(prefs.notifyNewEpisode);
        }
        if (typeof prefs.notifyTtfReady === "boolean") {
          setNotifyTtf(prefs.notifyTtfReady);
        }
        if (typeof prefs.notifyPromo === "boolean") {
          setNotifyPromo(prefs.notifyPromo);
        }
      }
    });
    apiGet("/api/orders").then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok) {
        setOrders(response.data?.orders || []);
      }
      setOrdersLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [isSignedIn]);

  const applySetting = (nextRegion, nextLang, nextHide, nextName, nextNotify) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REGION_KEY, nextRegion);
      window.localStorage.setItem(LANG_KEY, nextLang);
      window.localStorage.setItem(HIDE_ADULT_KEY, nextHide ? "1" : "0");
      window.localStorage.setItem(DISPLAY_NAME_KEY, nextName || "");
      window.localStorage.setItem(NOTIFY_NEW_KEY, nextNotify.newEpisode ? "1" : "0");
      window.localStorage.setItem(NOTIFY_TTF_KEY, nextNotify.ttfReady ? "1" : "0");
      window.localStorage.setItem(NOTIFY_PROMO_KEY, nextNotify.promo ? "1" : "0");
    }
    setCookie(REGION_KEY, nextRegion);
    setCookie(LANG_KEY, nextLang);
    setCookie(NOTIFY_NEW_KEY, nextNotify.newEpisode ? "1" : "0");
    setCookie(NOTIFY_TTF_KEY, nextNotify.ttfReady ? "1" : "0");
    setCookie(NOTIFY_PROMO_KEY, nextNotify.promo ? "1" : "0");
  };

  const handleSave = () => {
    applySetting(region, language, hideAdultHistory, displayName, {
      newEpisode: notifyNew,
      ttfReady: notifyTtf,
      promo: notifyPromo,
    });
    if (isSignedIn) {
      const payload = {
        notifyNewEpisode: notifyNew,
        notifyTtfReady: notifyTtf,
        notifyPromo,
        region,
        language,
        hideAdultHistory,
        displayName,
      };
      apiPost("/api/preferences", { preferences: payload }).then((response) => {
        if (response.ok) {
          applyPreferencesToStorage(payload);
          setMessage("Preferences saved.");
        } else {
          setMessage(response.error || "Save failed.");
        }
      });
    } else {
      setMessage("Preferences saved.");
    }
  };

  const regionConfig = getRegionConfig(region);
  const subscriptionLabel = useMemo(() => {
    if (!subscription?.active) {
      return "Free";
    }
    return `${subscription.planId || plan} (active)`;
  }, [subscription, plan]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Manage profile, subscription, and preferences.
          </p>
        </div>

        {message ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-3 text-xs text-neutral-300">
            {message}
          </div>
        ) : null}

        {/* 老王注释：阅读统计组件 */}
        {isSignedIn && <ReadingStats />}

        <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase text-neutral-500">Display name</label>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-neutral-500">Account</label>
              <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300">
                {isSignedIn ? user?.email || user?.id || "Signed in" : "Guest"}
              </div>
            </div>
          </div>
          {isSignedIn ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-xs text-neutral-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  Email verification:{" "}
                  <span className="text-white">
                    {user?.emailVerified ? "Verified" : "Not verified"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyStatus("");
                      apiPost("/api/auth/request-verify", { email: user?.email || "" }).then(
                        (response) => {
                          if (response.ok) {
                            setVerifyStatus("Verification sent (dev token below).");
                            setVerifyToken(response.data?.token || "");
                          } else {
                            setVerifyStatus(response.error || "Request failed.");
                            setVerifyToken("");
                          }
                        }
                      );
                    }}
                    className="rounded-full border border-neutral-700 px-3 py-1"
                  >
                    Send verification
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!verifyToken) {
                        setVerifyStatus("Paste token first.");
                        return;
                      }
                      apiPost("/api/auth/verify", { token: verifyToken }).then((response) => {
                        if (response.ok) {
                          setVerifyStatus("Verified.");
                          setVerifyToken("");
                        } else {
                          setVerifyStatus(response.error || "Verify failed.");
                        }
                      });
                    }}
                    className="rounded-full bg-white px-3 py-1 text-neutral-900"
                  >
                    Verify now
                  </button>
                </div>
              </div>
              {verifyToken ? (
                <div className="mt-2 break-all rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-[11px]">
                  {verifyToken}
                </div>
              ) : null}
              {verifyStatus ? <div className="mt-2 text-[11px]">{verifyStatus}</div> : null}
            </div>
          ) : null}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-xs text-neutral-300">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs text-neutral-400">Password reset</div>
              <input
                value={resetToken}
                onChange={(event) => setResetToken(event.target.value)}
                placeholder="Reset token"
                className="w-full flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs"
              />
              <input
                type="password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder="New password"
                className="w-full flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  setResetStatus("");
                  apiPost("/api/auth/reset", { token: resetToken, password: resetPassword }).then(
                    (response) => {
                      if (response.ok) {
                        setResetStatus("Password reset.");
                        setResetToken("");
                        setResetPassword("");
                      } else {
                        setResetStatus(response.error || "Reset failed.");
                      }
                    }
                  );
                }}
                className="rounded-full bg-white px-3 py-1 text-neutral-900"
              >
                Reset now
              </button>
            </div>
            {resetStatus ? <div className="mt-2 text-[11px]">{resetStatus}</div> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/orders")}
              className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
            >
              View Orders
            </button>
            <button
              type="button"
              onClick={() => router.push("/notifications")}
              className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
            >
              Notification Center
            </button>
            <button
              type="button"
              onClick={() => router.push("/faq")}
              className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
            >
              Help & FAQ
            </button>
            <button
              type="button"
              onClick={() => router.push("/support")}
              className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
            >
              Contact Support
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Subscription</h2>
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-400">
            <div>
              <div className="text-xs uppercase text-neutral-500">Plan</div>
              <div className="mt-1 text-sm text-neutral-200">{subscriptionLabel}</div>
              {subscription?.renewAt ? (
                <div className="mt-1 text-xs text-neutral-500">
                  Renews at {new Date(subscription.renewAt).toLocaleDateString()}
                </div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/subscribe")}
                className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
              >
                Manage
              </button>
              <button
                type="button"
                disabled={!subscription?.active || working === "cancel"}
                onClick={async () => {
                  setWorking("cancel");
                  const response = await cancelSubscription();
                  if (response.ok) {
                    setMessage("Subscription canceled.");
                  } else {
                    setMessage(response.error || "Cancel failed.");
                  }
                  setWorking("");
                }}
                className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase text-neutral-500">Region</label>
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              >
                {REGION_KEYS.map((item) => (
                  <option key={item} value={item}>
                    {getRegionConfig(item).label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-neutral-500">
                Legal age: {regionConfig.legalAge}+
              </p>
            </div>

            <div>
              <label className="text-xs uppercase text-neutral-500">Language</label>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hideAdultHistory}
              onChange={(event) => setHideAdultHistory(event.target.checked)}
            />
            Hide adult history
          </label>
        </section>

        <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Notification Preferences</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notifyNew}
              onChange={(event) => setNotifyNew(event.target.checked)}
            />
            New episode alerts
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notifyTtf}
              onChange={(event) => setNotifyTtf(event.target.checked)}
            />
            TTF ready reminders
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notifyPromo}
              onChange={(event) => setNotifyPromo(event.target.checked)}
            />
            Promotions and offers
          </label>
        </section>

        <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="text-sm text-neutral-400">
            Password updates are available in the next release.
          </p>
          <button
            type="button"
            onClick={() => setMessage("Password reset requested. (Mock)")}
            className="rounded-full border border-neutral-800 px-4 py-2 text-xs"
          >
            Request password reset
          </button>
        </section>

        <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          {ordersLoading ? (
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-400">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-400">
              No orders yet.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.orderId}
                  className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{order.packageId}</p>
                    <p className="text-xs text-neutral-400">{order.status}</p>
                  </div>
                  <div className="mt-2 text-xs text-neutral-400">
                    {order.amount} {order.currency} / {order.orderId}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900"
        >
          Save Preferences
        </button>
      </div>
    </main>
  );
}
