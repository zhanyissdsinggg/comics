"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import ReadingStats from "../../components/account/ReadingStats";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import CommerceSuccessBanner from "../../components/common/CommerceSuccessBanner";
import StorefrontPathwaysGrid from "../../components/common/StorefrontPathwaysGrid";
import { LANGUAGE_OPTIONS, REGION_KEYS, getRegionConfig } from "../../lib/region/config";
import { setCookie } from "../../lib/cookies";
import { applyPreferencesToStorage } from "../../lib/preferencesClient";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { apiGet, apiPost } from "../../lib/apiClient";
import SocialAuthButton from "../../components/auth/SocialAuthButton";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { isGoogleAuthEnabled } from "../../lib/socialAuthConfig";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";

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
  const { hydrated, isSignedIn, user } = useAuthStore();
  const { plan, subscription, loadWallet, cancelSubscription } = useWalletStore();
  const [region, setRegion] = useState("global");
  const [language, setLanguage] = useState("en");
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
  const [securityStatus, setSecurityStatus] = useState("");
  const [providers, setProviders] = useState({ google: false, password: false });
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState("");
  const [providerBusy, setProviderBusy] = useState(false);
  const [commerceNotice, setCommerceNotice] = useState(null);
  const googleAuthEnabled = isGoogleAuthEnabled();

  useEffect(() => {
    const storedRegion = readStorage(REGION_KEY, "global");
    const storedLang = readStorage(LANG_KEY, "en");
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
  }, []);

  useEffect(() => {
    if (!hydrated || !isSignedIn) {
      return;
    }

    loadWallet();
  }, [hydrated, isSignedIn, loadWallet]);

  useEffect(() => {
    let mounted = true;

    if (!hydrated) {
      setOrdersLoading(true);
      return () => {
        mounted = false;
      };
    }

    if (!isSignedIn) {
      setOrders([]);
      setOrdersLoading(false);
      return () => {
        mounted = false;
      };
    }

    setOrdersLoading(true);
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
    apiGet("/api/orders", { suppressAuthModal: true }).then((response) => {
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
  }, [hydrated, isSignedIn]);

  const loadAuthProviders = useCallback(async () => {
    if (!hydrated) {
      return;
    }

    if (!isSignedIn) {
      setProviders({ google: false, password: false });
      setProvidersLoading(false);
      return;
    }

    setProvidersLoading(true);
    const response = await apiGet("/api/auth/providers", { suppressAuthModal: true });
    if (response.ok) {
      const payload = response.data?.providers || {};
      setProviders({
        google: Boolean(payload.google),
        password: Boolean(payload.password),
      });
    }
    setProvidersLoading(false);
  }, [hydrated, isSignedIn]);

  useEffect(() => {
    loadAuthProviders();
  }, [loadAuthProviders]);

  useEffect(() => {
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/account")));
  }, []);

  const applySetting = (nextRegion, nextLang, nextHide, nextName, nextNotify) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REGION_KEY, nextRegion);
      window.localStorage.setItem(LANG_KEY, nextLang);
      window.localStorage.setItem(HIDE_ADULT_KEY, nextHide ? "1" : "0");
      window.localStorage.setItem(DISPLAY_NAME_KEY, nextName || "");
      window.localStorage.setItem(NOTIFY_NEW_KEY, nextNotify.newEpisode ? "1" : "0");
      window.localStorage.setItem(NOTIFY_TTF_KEY, nextNotify.ttfReady ? "1" : "0");
      window.localStorage.setItem(NOTIFY_PROMO_KEY, nextNotify.promo ? "1" : "0");
      window.dispatchEvent(
        new CustomEvent("mn-region-change", {
          detail: { region: nextRegion },
        })
      );
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

  const handleRequestPasswordReset = async () => {
    setSecurityStatus("");
    const email = user?.email || "";
    if (!email) {
      setSecurityStatus("Email not found. Please sign in again.");
      return;
    }

    const response = await apiPost("/api/auth/request-reset", { email });
    if (response.ok) {
      setSecurityStatus("Password reset email sent.");
    } else {
      setSecurityStatus(response.error || "Failed to send password reset email.");
    }
  };

  const regionConfig = getRegionConfig(region);
  const subscriptionLabel = useMemo(() => {
    if (!subscription?.active) {
      return "Free";
    }
    return `${subscription.planId || plan} (active)`;
  }, [subscription, plan]);

  const accountHeroStats = useMemo(
    () => [
      {
        label: "Account status",
        value: !hydrated ? "Checking..." : isSignedIn ? "Active" : "Guest mode",
        hint: !hydrated
          ? "Session status is still loading."
          : isSignedIn
            ? user?.emailVerified
              ? "Signed in and ready for billing changes."
              : "Verification is still pending."
            : "Sign in to sync history, billing, and alerts.",
      },
      {
        label: "Membership",
        value: subscription?.active ? "Member" : "Free",
        hint: subscription?.renewAt
          ? `Renews ${new Date(subscription.renewAt).toLocaleDateString()}`
          : "Upgrade to unlock membership perks.",
      },
      {
        label: "Region",
        value: regionConfig.label,
        hint: `${language.toUpperCase()} reading experience | ${regionConfig.legalAge}+ age gate`,
      },
      {
        label: "Receipts",
        value: hydrated && isSignedIn ? orders.length.toLocaleString() : "0",
        hint: ordersLoading
          ? "Loading recent receipts."
          : isSignedIn
            ? "Review recent payments and refunds here."
            : "Sign in to access purchase history.",
      },
    ],
    [
      hydrated,
      isSignedIn,
      language,
      orders.length,
      ordersLoading,
      regionConfig.label,
      regionConfig.legalAge,
      subscription?.active,
      subscription?.renewAt,
      user?.emailVerified,
    ],
  );

  const fieldLabelClass = "text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500";
  const fieldClass =
    "mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";
  const secondaryButtonClass =
    "rounded-full border border-white/10 bg-black/10 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";
  const checkboxClass =
    "h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-emerald-400 focus:ring-emerald-400/30";
  const accountActionCards = useMemo(
    () => [
      {
        id: "account-membership",
        eyebrow: "Membership",
        title: subscription?.active
          ? `${subscription.planId || plan} is active on this account.`
          : "Membership is still the cleanest upgrade path for regular readers.",
        description: subscription?.active
          ? "Plan controls, renewal timing, and account billing should stay visible from the same account surface."
          : "Account pages should make plan comparison and billing control feel easy instead of buried.",
        ctaLabel: "Manage membership",
        onClick: () =>
          router.push(
            buildPathWithAttribution("/subscribe", {
              entryPoint: "ACCOUNT_SUBSCRIPTION",
              sourcePath: "/account",
              returnTo: "/account",
            }),
          ),
        accentClass:
          "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15",
      },
      {
        id: "account-orders",
        eyebrow: "Receipts",
        title: hydrated && isSignedIn
          ? `${orders.length} receipt${orders.length === 1 ? "" : "s"} loaded for this account.`
          : "Order history should stay one tap away from billing changes.",
        description:
          "Receipts, refunds, and billing follow-up should not live in separate dead-end screens once someone reaches the account center.",
        ctaLabel: "Open orders",
        onClick: () => router.push("/orders"),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "account-alerts",
        eyebrow: "Alerts",
        title: "Notifications and reading nudges belong next to settings.",
        description:
          "A premium account page should connect episode alerts, promo messages, and reading reminders back to the same preferences system.",
        ctaLabel: "Open notifications",
        onClick: () => router.push("/notifications"),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
      {
        id: "account-support",
        eyebrow: "Support",
        title: "Account problems should have a fast human fallback.",
        description:
          "Verification issues, billing edge cases, or sign-in recovery should all route cleanly into support from here.",
        ctaLabel: "Contact support",
        onClick: () => router.push("/support"),
        accentClass:
          "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]",
      },
    ],
    [hydrated, isSignedIn, orders.length, plan, router, subscription?.active, subscription?.planId],
  );
  return (
    <main className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          eyebrow="Account"
          title="Keep billing, sign-in, and reading settings in one place."
          description="Update your display name, review receipts, and control the settings that shape reading and billing."
          secondary="The goal here is simple: fewer dead ends, faster account fixes, and one clear home for plan changes."
          stats={accountHeroStats}
          actions={
            <>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    buildPathWithAttribution("/subscribe", {
                      entryPoint: "ACCOUNT_SUBSCRIPTION",
                      sourcePath: "/account",
                      returnTo: "/account",
                    })
                  )
                }
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Manage membership
              </button>
              <button
                type="button"
                onClick={() => router.push("/orders")}
                className={secondaryButtonClass}
              >
                Order history
              </button>
            </>
          }
        />

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {message ? (
          <SurfacePanel className="border border-white/10 bg-emerald-500/10">
            <p className="text-sm text-neutral-100">{message}</p>
          </SurfacePanel>
        ) : null}

        {hydrated && isSignedIn ? <ReadingStats /> : null}

        <SurfacePanel className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Account command deck
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Keep billing, recovery, and reading controls connected.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                A polished account center does not make people hunt through isolated settings. It keeps the next useful
                action clear whether the user wants receipts, alerts, plan changes, or support.
              </p>
            </div>
            <p className="text-sm text-neutral-500">
              {hydrated && isSignedIn ? "Signed-in account center" : "Guest account preferences"}
            </p>
          </div>
          <StorefrontPathwaysGrid cards={accountActionCards} />
        </SurfacePanel>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <SurfacePanel className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Profile
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                  Profile, verification, and help
                </h2>
                <p className="text-sm leading-6 text-neutral-400">
                  Keep your display name, verification status, and support shortcuts easy to reach.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={fieldLabelClass}>Display name</label>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Your name"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass}>Account</label>
                  <div className={`${fieldClass} text-neutral-300`}>
                    {!hydrated
                      ? "Checking session..."
                      : isSignedIn
                        ? user?.email || user?.id || "Active account"
                        : "Browsing as guest"}
                  </div>
                </div>
              </div>

              {hydrated && isSignedIn ? (
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-xs text-neutral-300">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      Verification status:{" "}
                      <span className="text-white">
                        {user?.emailVerified ? "Verified" : "Not verified"}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(user?.emailVerified)}
                      onClick={() => {
                        setVerifyStatus("");
                        apiPost("/api/auth/request-verify", { email: user?.email || "" }).then(
                          (response) => {
                            if (response.ok) {
                              setVerifyStatus("Verification email sent.");
                            } else {
                              setVerifyStatus(response.error || "Request failed.");
                            }
                          }
                        );
                      }}
                      className={secondaryButtonClass}
                    >
                      Send verification email
                    </button>
                  </div>
                  {verifyStatus ? <div className="mt-2 text-[11px]">{verifyStatus}</div> : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className={secondaryButtonClass}
                >
                  Order history
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/notifications")}
                  className={secondaryButtonClass}
                >
                  Notification center
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/faq")}
                  className={secondaryButtonClass}
                >
                  Help center
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/support")}
                  className={secondaryButtonClass}
                >
                  Contact Support
                </button>
              </div>
            </SurfacePanel>

            <SurfacePanel className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Preferences
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                  Reading preferences
                </h2>
                <p className="text-sm leading-6 text-neutral-400">
                  Keep region, language, and mature-history controls together so the reading experience stays predictable.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={fieldLabelClass}>Region</label>
                  <select
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    className={fieldClass}
                  >
                    {REGION_KEYS.map((item) => (
                      <option key={item} value={item}>
                        {getRegionConfig(item).label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-neutral-500">Legal age: {regionConfig.legalAge}+</p>
                </div>

                <div>
                  <label className={fieldLabelClass}>Language</label>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className={fieldClass}
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-neutral-200">
                <input
                  type="checkbox"
                  checked={hideAdultHistory}
                  onChange={(event) => setHideAdultHistory(event.target.checked)}
                  className={checkboxClass}
                />
                Hide adult history
              </label>
            </SurfacePanel>

            <SurfacePanel className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Alerts
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                  Alerts and reminders
                </h2>
              </div>

              <label className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-neutral-200">
                <input
                  type="checkbox"
                  checked={notifyNew}
                  onChange={(event) => setNotifyNew(event.target.checked)}
                  className={checkboxClass}
                />
                New episode alerts
              </label>
              <label className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-neutral-200">
                <input
                  type="checkbox"
                  checked={notifyTtf}
                  onChange={(event) => setNotifyTtf(event.target.checked)}
                  className={checkboxClass}
                />
                Free unlock reminders
              </label>
              <label className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-neutral-200">
                <input
                  type="checkbox"
                  checked={notifyPromo}
                  onChange={(event) => setNotifyPromo(event.target.checked)}
                  className={checkboxClass}
                />
                Promotions and offers
              </label>
            </SurfacePanel>
          </div>

          <div className="space-y-6">
            <SurfacePanel className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Billing
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                  Membership and billing
                </h2>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-neutral-400">
                <div>
                  <div className={fieldLabelClass}>Plan</div>
                  <div className="mt-1 text-sm text-neutral-200">{subscriptionLabel}</div>
                  {subscription?.renewAt ? (
                    <div className="mt-1 text-xs text-neutral-500">
                      Renews at {new Date(subscription.renewAt).toLocaleDateString()}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        buildPathWithAttribution("/subscribe", {
                          entryPoint: "ACCOUNT_SUBSCRIPTION",
                          sourcePath: "/account",
                          returnTo: "/account",
                        })
                      )
                    }
                    className={secondaryButtonClass}
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
                    className={secondaryButtonClass}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </SurfacePanel>

            <SurfacePanel className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Security
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                  Sign-in methods and recovery
                </h2>
                <p className="text-sm leading-6 text-neutral-400">
                  Audit which sign-in methods are connected and trigger password recovery without hunting through separate dialogs.
                </p>
              </div>

              {hydrated && isSignedIn ? (
                <div className="space-y-3 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-xs text-neutral-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Password login</span>
                    <span className={providers.password ? "text-emerald-400" : "text-amber-300"}>
                      {providers.password ? "Enabled" : "Not set"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Google login</span>
                    <span className={providers.google ? "text-emerald-400" : "text-neutral-400"}>
                      {providersLoading ? "Loading..." : providers.google ? "Connected" : "Not connected"}
                    </span>
                  </div>
                </div>
              ) : null}

              {hydrated && isSignedIn && googleAuthEnabled ? (
                <div className="space-y-3">
                  {providers.google ? (
                    <button
                      type="button"
                      disabled={providerBusy}
                      onClick={async () => {
                        setProviderStatus("");
                        setProviderBusy(true);
                        const response = await apiPost("/api/auth/google/unlink");
                        if (response.ok) {
                          setProviderStatus("Google account disconnected.");
                          await loadAuthProviders();
                        } else {
                          setProviderStatus(response.message || response.error || "Failed to disconnect Google.");
                        }
                        setProviderBusy(false);
                      }}
                      className={secondaryButtonClass}
                    >
                      Disconnect Google
                    </button>
                  ) : (
                    <div className="max-w-sm">
                      <SocialAuthButton
                        provider="google"
                        action="link"
                        requestPayload={{ mode: "link" }}
                        onSuccess={async () => {
                          setProviderStatus("Google account connected.");
                          await loadAuthProviders();
                        }}
                        onError={(nextMessage) => {
                          setProviderStatus(nextMessage || "Failed to connect Google.");
                        }}
                        isLoading={providerBusy}
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {hydrated && isSignedIn && !googleAuthEnabled ? (
                <div className="text-xs text-neutral-500">Google login is not configured.</div>
              ) : null}

              <button
                type="button"
                disabled={!hydrated || !isSignedIn}
                onClick={handleRequestPasswordReset}
                className={secondaryButtonClass}
              >
                Request password reset
              </button>
              {securityStatus ? <div className="text-xs text-neutral-300">{securityStatus}</div> : null}
              {providerStatus ? <div className="text-xs text-neutral-300">{providerStatus}</div> : null}
            </SurfacePanel>

            <SurfacePanel className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Orders
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                  Recent receipts
                </h2>
              </div>
              {!hydrated || ordersLoading ? (
                <div className="rounded-[24px] border border-white/10 bg-black/10 p-4 text-sm text-neutral-400">
                  Pulling your recent receipts.
                </div>
              ) : !isSignedIn ? (
                <div className="rounded-[24px] border border-white/10 bg-black/10 p-4 text-sm text-neutral-300">
                  Sign in to review receipts, refunds, and your recent purchases.
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-black/10 p-4 text-sm text-neutral-400">
                  No purchases yet. Top-ups and membership charges will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div
                      key={order.orderId}
                      className="rounded-[24px] border border-white/10 bg-black/10 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{order.packageId}</p>
                        <p className="text-xs text-neutral-400">{order.status}</p>
                      </div>
                      <div className="mt-2 text-xs text-neutral-400">
                        {order.amount} {order.currency} / {order.orderId}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SurfacePanel>

            <SurfacePanel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                  Settings sync
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  Save the current preferences to this device and, when signed in, to your account profile.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
              >
                Save account settings
              </button>
            </SurfacePanel>
          </div>
        </div>
      </div>
    </main>
  );
}


