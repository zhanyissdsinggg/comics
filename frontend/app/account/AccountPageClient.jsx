"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import ReadingStats from "../../components/account/ReadingStats";
import MyLibraryPanel from "../../components/account/MyLibraryPanel";
import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import CommerceSuccessBanner from "../../components/common/CommerceSuccessBanner";
import StorefrontPathwaysGrid from "../../components/common/StorefrontPathwaysGrid";
import {
  LANGUAGE_OPTIONS,
  REGION_KEYS,
  getRegionConfig,
} from "../../lib/region/config";
import { setCookie } from "../../lib/cookies";
import { applyPreferencesToStorage } from "../../lib/preferencesClient";
import { formatUSDisplayCurrency } from "../../lib/localization";
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
import { buildSupportPath } from "../../lib/supportRouting";

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

function formatOrderAmount(amount, currency) {
  const numericAmount = Number(amount || 0);
  return formatUSDisplayCurrency(numericAmount, currency);
}

function formatOrderDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AccountPage({ initialSignedIn = false }) {
  const router = useRouter();
  const { hydrated, isSignedIn, user } = useAuthStore();
  const { plan, subscription, loadWallet, cancelSubscription } =
    useWalletStore();
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
  const [providers, setProviders] = useState({
    google: false,
    password: false,
  });
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState("");
  const [providerBusy, setProviderBusy] = useState(false);
  const [commerceNotice, setCommerceNotice] = useState(null);
  const googleAuthEnabled = isGoogleAuthEnabled();
  const viewerSignedIn = hydrated ? isSignedIn : initialSignedIn;
  const openAuthPrompt = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:open"));
    }
  }, []);

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

  const syncPreferencesFromAccount = useCallback((prefs = {}) => {
    applyPreferencesToStorage(prefs);

    if (typeof prefs.region === "string" && prefs.region) {
      setRegion(prefs.region);
    }
    if (typeof prefs.language === "string" && prefs.language) {
      setLanguage(prefs.language);
    }
    if (typeof prefs.hideAdultHistory === "boolean") {
      setHideAdultHistory(prefs.hideAdultHistory);
    }
    if (typeof prefs.displayName === "string") {
      setDisplayName(prefs.displayName);
    }
    if (typeof prefs.notifyNewEpisode === "boolean") {
      setNotifyNew(prefs.notifyNewEpisode);
    }
    if (typeof prefs.notifyTtfReady === "boolean") {
      setNotifyTtf(prefs.notifyTtfReady);
    }
    if (typeof prefs.notifyPromo === "boolean") {
      setNotifyPromo(prefs.notifyPromo);
    }
  }, []);

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
        syncPreferencesFromAccount(response.data.preferences);
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
  }, [hydrated, isSignedIn, syncPreferencesFromAccount]);

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
    const response = await apiGet("/api/auth/providers", {
      suppressAuthModal: true,
    });
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
    setCommerceNotice(
      getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/account")),
    );
  }, []);

  const applySetting = (
    nextRegion,
    nextLang,
    nextHide,
    nextName,
    nextNotify,
  ) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REGION_KEY, nextRegion);
      window.localStorage.setItem(LANG_KEY, nextLang);
      window.localStorage.setItem(HIDE_ADULT_KEY, nextHide ? "1" : "0");
      window.localStorage.setItem(DISPLAY_NAME_KEY, nextName || "");
      window.localStorage.setItem(
        NOTIFY_NEW_KEY,
        nextNotify.newEpisode ? "1" : "0",
      );
      window.localStorage.setItem(
        NOTIFY_TTF_KEY,
        nextNotify.ttfReady ? "1" : "0",
      );
      window.localStorage.setItem(
        NOTIFY_PROMO_KEY,
        nextNotify.promo ? "1" : "0",
      );
      window.dispatchEvent(
        new CustomEvent("mn-region-change", {
          detail: { region: nextRegion },
        }),
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
          syncPreferencesFromAccount(response.data?.preferences || payload);
          setMessage("Changes saved.");
        } else {
          setMessage(response.error || "Save failed.");
        }
      });
    } else {
      setMessage("Saved to this device.");
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
      setSecurityStatus("Reset email sent.");
    } else {
      setSecurityStatus(response.error || "Couldn't send the reset email.");
    }
  };

  const regionConfig = getRegionConfig(region);
  const subscriptionLabel = useMemo(() => {
    if (!subscription?.active) {
      return "Free";
    }
    return `${subscription.planId || plan} (active)`;
  }, [subscription, plan]);

  const accountHeroStats = useMemo(() => {
    if (!viewerSignedIn) {
      return [
        {
          label: "Status",
          value: "Signed out",
          hint: "Sign in to keep purchases, library progress, and recovery attached to one account.",
        },
        {
          label: "Saved now",
          value: "This device",
          hint: "Region, language, 18+ history, display name, and alerts still save here right away.",
        },
        {
          label: "Point packs",
          value: "One-time",
          hint: "Use point packs when you want flexible unlocks instead of a monthly plan.",
        },
        {
          label: "Membership",
          value: "Monthly",
          hint: "Compare recurring plans before you sign in or start one.",
        },
      ];
    }

    return [
      {
        label: "Status",
        value: "Signed in",
        hint: !hydrated
          ? "Library, purchases, and settings are loading for this account."
          : user?.emailVerified
            ? "Reading, purchases, and alerts can stay synced here."
            : "Verify your email to keep recovery simple.",
      },
      {
        label: "Membership",
        value: subscription?.active ? "Member" : "Free",
        hint: subscription?.renewAt
          ? `Renews ${new Date(subscription.renewAt).toLocaleDateString()}`
          : !hydrated
            ? "Membership details live here once the page is ready."
            : "Upgrade any time if you read often.",
      },
      {
        label: "Saved here",
        value: regionConfig.label,
        hint: `${language.toUpperCase()} | ${regionConfig.legalAge}+ age check`,
      },
      {
        label: "Recent charges",
        value: !hydrated
          ? "Loading"
          : ordersLoading
            ? "Loading"
            : orders.length > 0
              ? orders.length.toLocaleString()
              : "None yet",
        hint: ordersLoading
          ? "Recent charges and receipts show up below."
          : "Recent charges.",
      },
    ];
  }, [
    hydrated,
    viewerSignedIn,
    language,
    orders.length,
    ordersLoading,
    regionConfig.label,
    regionConfig.legalAge,
    subscription?.active,
    subscription?.renewAt,
    user?.emailVerified,
  ]);

  const accountActionCards = useMemo(() => {
    if (!viewerSignedIn) {
      return [
        {
          id: "signin",
          eyebrow: "Account",
          title: "Sign in and keep everything together.",
          description:
            "Move purchases, progress, and recovery off this device-only setup.",
          cta: "Sign in",
          onClick: openAuthPrompt,
          accentClass:
            "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-slate-900 hover:border-[color:var(--gush-border-strong)] hover:bg-white",
        },
        {
          id: "recover",
          eyebrow: "Recovery",
          title: "Lost access? Reset your password.",
          description:
            "Use reset for email/password accounts. If sign-in still looks wrong, use support.",
          cta: "Reset password",
          onClick: () => router.push("/auth/reset"),
          accentClass:
            "border-[color:var(--gush-border)] bg-white text-slate-900 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]",
        },
        {
          id: "membership",
          eyebrow: "Membership",
          title: "See monthly plans first.",
          description: "Review the plans first, then start when ready.",
          cta: "Plans",
          onClick: () =>
            router.push(
              buildPathWithAttribution("/subscribe", {
                entryPoint: "ACCOUNT_ACTIONS",
                sourcePath: "/account",
                returnTo: "/account",
              }),
            ),
          accentClass:
            "border-[color:var(--gush-border)] bg-white text-slate-900 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]",
        },
        {
          id: "store",
          eyebrow: "Point packs",
          title: "Open point packs.",
          description: "Use point packs when you want one-off unlocks.",
          cta: "Point packs",
          onClick: () => router.push("/store"),
          accentClass:
            "border-[color:var(--gush-border)] bg-white text-slate-900 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]",
        },
      ];
    }

    return [
      {
        id: "membership",
        eyebrow: "Membership",
        title: subscription?.active
          ? "Manage renewal and plan."
          : "See membership before your next purchase.",
        description: subscription?.active
          ? subscription?.renewAt
            ? `Your plan renews on ${new Date(
                subscription.renewAt,
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}. Renewal and cancellation stay in one place.`
            : "Open membership to review renewal timing and cancellation."
          : "If you keep topping up, membership may fit better next time.",
        cta: subscription?.active ? "Membership" : "Plans",
        onClick: () =>
          router.push(
            buildPathWithAttribution("/subscribe", {
              entryPoint: "ACCOUNT_ACTIONS",
              sourcePath: "/account",
              returnTo: "/account",
            }),
          ),
        accentClass:
          "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] text-slate-900 hover:border-[color:var(--gush-border-strong)] hover:bg-white",
      },
      {
        id: "purchases",
        eyebrow: "Purchases",
        title:
          orders.length > 0
            ? "Find receipts fast."
            : "Keep charges easy to find.",
        description:
          orders.length > 0
            ? "Recent charges."
            : "Receipts and order IDs show here.",
        cta: "Orders",
        onClick: () => router.push("/orders"),
        accentClass:
          "border-[color:var(--gush-border)] bg-white text-slate-900 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]",
      },
      {
        id: "library",
        eyebrow: "Reading",
        title: "Open your library.",
        description: "Saved titles, recent reading, and progress.",
        cta: "Open library",
        onClick: () => router.push("/library"),
        accentClass:
          "border-[color:var(--gush-border)] bg-white text-slate-900 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]",
      },
      {
        id: "support",
        eyebrow: "Support",
        title: "Get support.",
        description:
          "Sign-in trouble, wrong charges, missing points, or 18+ access.",
        cta: "Support",
        onClick: () =>
          router.push(
            buildSupportPath({
              topic: "account",
              context: "Account help from account page",
            }),
          ),
        accentClass:
          "border-[color:var(--gush-border)] bg-white text-slate-900 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]",
      },
    ];
  }, [
    openAuthPrompt,
    orders.length,
    router,
    subscription?.active,
    subscription?.renewAt,
    viewerSignedIn,
  ]);

  const sectionEyebrowClass =
    "text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500";
  const sectionTitleClass =
    "font-display text-2xl font-semibold tracking-tight text-slate-950";
  const mutedCopyClass = "text-sm leading-6 text-slate-600";
  const fieldLabelClass =
    "text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500";
  const fieldClass =
    "mt-2 w-full rounded-2xl border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[color:var(--gush-border-strong)] focus:ring-2 focus:ring-slate-200/80";
  const secondaryButtonClass =
    "rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] disabled:cursor-not-allowed disabled:opacity-50";
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
  const checkboxClass =
    "h-4 w-4 rounded border-black/12 bg-white text-slate-950 focus:ring-slate-200/80";
  const checkboxCardClass =
    "flex items-center gap-3 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-700";
  const messageIsError = /failed|couldn't|not found/i.test(message);
  const accountDeskTitle = viewerSignedIn
    ? "Your account."
    : "Start on this device.";
  const accountDeskCopy = viewerSignedIn
    ? orders.length > 0
      ? "Jump to orders, membership, or support."
      : "Save preferences now. Orders appear later."
    : "Device settings save here now. Sign in when you want sync.";

  return (
    <div className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Account"
            title={viewerSignedIn ? "Your account." : "This device, for now."}
            description={
              viewerSignedIn
                ? "Reading, orders, and security."
                : "Device settings save here first."
            }
            secondary={
              viewerSignedIn
                ? ""
                : "Sign in later to keep orders and progress together."
            }
            stats={accountHeroStats}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (!viewerSignedIn) {
                      openAuthPrompt();
                      return;
                    }
                    router.push("/orders");
                  }}
                  className={primaryButtonClass}
                >
                  {viewerSignedIn ? "Orders" : "Sign in"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!viewerSignedIn) {
                      router.push("/auth/reset");
                      return;
                    }
                    router.push(
                      buildPathWithAttribution("/subscribe", {
                        entryPoint: "ACCOUNT_SUBSCRIPTION",
                        sourcePath: "/account",
                        returnTo: "/account",
                      }),
                    );
                  }}
                  className={secondaryButtonClass}
                >
                  {viewerSignedIn ? "Manage membership" : "Reset password"}
                </button>
              </>
            }
          />

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Account desk
              </p>
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  {accountDeskTitle}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {accountDeskCopy}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {viewerSignedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => router.push("/library")}
                    className={primaryButtonClass}
                  >
                    Open library
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        buildSupportPath({
                          topic: "account",
                          context: "Account help from account hero desk",
                        }),
                      )
                    }
                    className={secondaryButtonClass}
                  >
                    Support
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={openAuthPrompt}
                    className={primaryButtonClass}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        buildPathWithAttribution("/subscribe", {
                          entryPoint: "ACCOUNT_SUBSCRIPTION",
                          sourcePath: "/account",
                          returnTo: "/account",
                        }),
                      )
                    }
                    className={secondaryButtonClass}
                  >
                    Plans
                  </button>
                </>
              )}
            </div>
          </SurfacePanel>
        </section>

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {!viewerSignedIn ? (
          <SurfacePanel
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            appearance="light"
            accent="blue"
          >
            <div>
              <p className={sectionEyebrowClass}>Signed out</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Keep this on one account.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Device settings work here now. Sign in when you want orders and
                progress together.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openAuthPrompt}
                className={primaryButtonClass}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => router.push("/auth/reset")}
                className={secondaryButtonClass}
              >
                Reset password
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    buildSupportPath({
                      topic: "account",
                      context: "Signed-out account help",
                    }),
                  )
                }
                className={secondaryButtonClass}
              >
                Support
              </button>
            </div>
          </SurfacePanel>
        ) : null}

        {message ? (
          <SurfacePanel
            appearance="light"
            accent={messageIsError ? "rose" : "amber"}
            className={
              messageIsError
                ? "border border-red-200 bg-red-50"
                : "border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]"
            }
          >
            <p
              className={`text-sm ${messageIsError ? "text-red-600" : "text-slate-700"}`}
            >
              {message}
            </p>
          </SurfacePanel>
        ) : null}

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="space-y-2">
            <p className={sectionEyebrowClass}>Quick actions</p>
            <h2 className={sectionTitleClass}>Choose a task.</h2>
          </div>
          <StorefrontPathwaysGrid
            cards={accountActionCards}
            columnsClassName="md:grid-cols-2 xl:grid-cols-4"
            appearance="light"
          />
        </SurfacePanel>

        <MyLibraryPanel
          viewerSignedIn={viewerSignedIn}
          onOpenAuth={openAuthPrompt}
        />

        {hydrated && isSignedIn ? <ReadingStats /> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            {viewerSignedIn ? null : (
              <SurfacePanel
                className="space-y-5"
                appearance="light"
                accent="blue"
              >
                <div className="space-y-2">
                  <p className={sectionEyebrowClass}>Local reading setup</p>
                  <h2 className={sectionTitleClass}>Save on this device.</h2>
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
                    <p className="mt-2 text-xs text-slate-500">
                      Legal age: {regionConfig.legalAge}+
                    </p>
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

                <label className={checkboxCardClass}>
                  <input
                    type="checkbox"
                    checked={hideAdultHistory}
                    onChange={(event) =>
                      setHideAdultHistory(event.target.checked)
                    }
                    className={checkboxClass}
                  />
                  Hide 18+ history on this device
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/mature-content")}
                    className={secondaryButtonClass}
                  >
                    Mature content guide
                  </button>
                </div>
              </SurfacePanel>
            )}

            {viewerSignedIn ? (
              <SurfacePanel
                className="space-y-5"
                appearance="light"
                accent="blue"
              >
                <div className="space-y-2">
                  <p className={sectionEyebrowClass}>Account basics</p>
                  <h2 className={sectionTitleClass}>
                    Name, email, and quick help
                  </h2>
                  <p className={mutedCopyClass}>Basics only.</p>
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
                    {!hydrated ? (
                      <div
                        className={`${fieldClass} flex flex-col justify-center gap-2`}
                        aria-hidden="true"
                      >
                        <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
                        <div className="h-3 w-40 animate-pulse rounded-full bg-slate-100" />
                      </div>
                    ) : (
                      <div className={`${fieldClass} text-slate-600`}>
                        {user?.email || user?.id || "Active account"}
                      </div>
                    )}
                  </div>
                </div>

                {hydrated && isSignedIn ? (
                  <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        Email status:{" "}
                        <span className="font-semibold text-slate-950">
                          {user?.emailVerified ? "Verified" : "Not verified"}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(user?.emailVerified)}
                        onClick={() => {
                          setVerifyStatus("");
                          apiPost("/api/auth/request-verify", {
                            email: user?.email || "",
                          }).then((response) => {
                            if (response.ok) {
                              setVerifyStatus("Verification email sent.");
                            } else {
                              setVerifyStatus(
                                response.error || "Request failed.",
                              );
                            }
                          });
                        }}
                        className={secondaryButtonClass}
                      >
                        Send another email
                      </button>
                    </div>
                    {verifyStatus ? (
                      <div className="mt-2 text-xs text-slate-600">
                        {verifyStatus}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/orders")}
                    className={secondaryButtonClass}
                  >
                    Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/notifications")}
                    className={secondaryButtonClass}
                  >
                    Notifications
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/faq")}
                    className={secondaryButtonClass}
                  >
                    FAQ
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        buildSupportPath({
                          topic: "account",
                          context: "Account help from account page",
                        }),
                      )
                    }
                    className={secondaryButtonClass}
                  >
                    Support
                  </button>
                </div>
              </SurfacePanel>
            ) : null}

            {viewerSignedIn ? (
              <SurfacePanel
                className="space-y-5"
                appearance="light"
                accent="blue"
              >
                <div className="space-y-2">
                  <p className={sectionEyebrowClass}>Reading setup</p>
                  <h2 className={sectionTitleClass}>
                    Region, language, and 18+ history
                  </h2>
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
                    <p className="mt-2 text-xs text-slate-500">
                      Legal age: {regionConfig.legalAge}+
                    </p>
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

                <label className={checkboxCardClass}>
                  <input
                    type="checkbox"
                    checked={hideAdultHistory}
                    onChange={(event) =>
                      setHideAdultHistory(event.target.checked)
                    }
                    className={checkboxClass}
                  />
                  Hide 18+ history
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/mature-content")}
                    className={secondaryButtonClass}
                  >
                    Mature content guide
                  </button>
                </div>
              </SurfacePanel>
            ) : null}

            <SurfacePanel
              className="space-y-4"
              appearance="light"
              accent="blue"
            >
              <div className="space-y-2">
                <p className={sectionEyebrowClass}>Notifications</p>
                <h2 className={sectionTitleClass}>
                  {viewerSignedIn
                    ? "Only keep the alerts that matter"
                    : "Keep only the alerts you want on this device"}
                </h2>
              </div>

              <label className={checkboxCardClass}>
                <input
                  type="checkbox"
                  checked={notifyNew}
                  onChange={(event) => setNotifyNew(event.target.checked)}
                  className={checkboxClass}
                />
                New chapter alerts
              </label>
              <label className={checkboxCardClass}>
                <input
                  type="checkbox"
                  checked={notifyTtf}
                  onChange={(event) => setNotifyTtf(event.target.checked)}
                  className={checkboxClass}
                />
                Free unlock reminders
              </label>
              <label className={checkboxCardClass}>
                <input
                  type="checkbox"
                  checked={notifyPromo}
                  onChange={(event) => setNotifyPromo(event.target.checked)}
                  className={checkboxClass}
                />
                Offers and promos
              </label>
            </SurfacePanel>
          </div>

          <div className="space-y-6">
            {!viewerSignedIn ? (
              <>
                <SurfacePanel
                  className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                  appearance="light"
                  accent="blue"
                >
                  <div>
                    <p className={sectionEyebrowClass}>Save</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Save these choices to this device.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    className={primaryButtonClass}
                  >
                    Save to this device
                  </button>
                </SurfacePanel>
              </>
            ) : (
              <>
                <SurfacePanel
                  className="space-y-4"
                  appearance="light"
                  accent="blue"
                >
                  <div className="space-y-2">
                    <p className={sectionEyebrowClass}>Membership & billing</p>
                    <h2 className={sectionTitleClass}>
                      Plan, renewal, and cancellation
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
                    <div>
                      <div className={fieldLabelClass}>Current plan</div>
                      <div className="mt-1 text-sm font-semibold text-slate-950">
                        {subscriptionLabel}
                      </div>
                      {subscription?.renewAt ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Renews on{" "}
                          {new Date(subscription.renewAt).toLocaleDateString()}
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
                            }),
                          )
                        }
                        className={secondaryButtonClass}
                      >
                        View membership
                      </button>
                      <button
                        type="button"
                        disabled={!subscription?.active || working === "cancel"}
                        onClick={async () => {
                          setWorking("cancel");
                          const response = await cancelSubscription();
                          if (response.ok) {
                            setMessage("Membership ended.");
                          } else {
                            setMessage(
                              response.error || "Couldn't end the membership.",
                            );
                          }
                          setWorking("");
                        }}
                        className={secondaryButtonClass}
                      >
                        Cancel membership
                      </button>
                    </div>
                  </div>
                </SurfacePanel>

                <SurfacePanel
                  className="space-y-4"
                  appearance="light"
                  accent="blue"
                >
                  <div className="space-y-2">
                    <p className={sectionEyebrowClass}>Security</p>
                    <h2 className={sectionTitleClass}>
                      Sign-in methods and recovery
                    </h2>
                    <p className={mutedCopyClass}>
                      See connected sign-in methods and send a reset email.
                    </p>
                  </div>

                  {hydrated && isSignedIn ? (
                    <div className="space-y-3 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 text-sm text-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>Email/password</span>
                        <span
                          className={
                            providers.password
                              ? "text-slate-950"
                              : "text-slate-500"
                          }
                        >
                          {providers.password ? "Ready" : "Not set"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>Google</span>
                        {providersLoading ? (
                          <span
                            aria-hidden="true"
                            className="inline-flex h-2 w-16 animate-pulse rounded-full bg-slate-200"
                          />
                        ) : (
                          <span
                            className={
                              providers.google
                                ? "text-slate-950"
                                : "text-slate-500"
                            }
                          >
                            {providers.google ? "Connected" : "Not connected"}
                          </span>
                        )}
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
                            const response = await apiPost(
                              "/api/auth/google/unlink",
                            );
                            if (response.ok) {
                              setProviderStatus("Google sign-in removed.");
                              await loadAuthProviders();
                            } else {
                              setProviderStatus(
                                response.message ||
                                  response.error ||
                                  "Failed to disconnect Google.",
                              );
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
                              setProviderStatus("Google sign-in connected.");
                              await loadAuthProviders();
                            }}
                            onError={(nextMessage) => {
                              setProviderStatus(
                                nextMessage || "Failed to connect Google.",
                              );
                            }}
                            isLoading={providerBusy}
                          />
                        </div>
                      )}
                    </div>
                  ) : null}

                  {hydrated && isSignedIn && !googleAuthEnabled ? (
                    <div className="text-xs text-slate-500">
                      Google login is not configured.
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={!hydrated || !isSignedIn}
                    onClick={handleRequestPasswordReset}
                    className={secondaryButtonClass}
                  >
                    Send password reset email
                  </button>
                  {securityStatus ? (
                    <div className="text-xs text-slate-600">
                      {securityStatus}
                    </div>
                  ) : null}
                  {providerStatus ? (
                    <div className="text-xs text-slate-600">
                      {providerStatus}
                    </div>
                  ) : null}
                </SurfacePanel>

                <SurfacePanel
                  className="space-y-4"
                  appearance="light"
                  accent="blue"
                >
                  <div className="space-y-2">
                    <p className={sectionEyebrowClass}>Purchases</p>
                    <h2 className={sectionTitleClass}>
                      Recent receipts and charges
                    </h2>
                    <p className={mutedCopyClass}>
                      Check the latest charge, then jump into billing help if
                      something looks off.
                    </p>
                  </div>
                  {!hydrated || ordersLoading ? (
                    <div
                      className="space-y-3 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4"
                      aria-hidden="true"
                    >
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div
                          key={index}
                          className="rounded-[20px] border border-[color:var(--gush-border)] bg-white px-4 py-4"
                        >
                          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
                          <div className="mt-3 h-3 w-40 animate-pulse rounded-full bg-slate-100" />
                          <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4 text-sm text-slate-500">
                      <p>
                        No purchases yet. Charges show up here after checkout.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => router.push("/store")}
                          className={secondaryButtonClass}
                        >
                          Point packs
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              buildSupportPath({
                                topic: "billing",
                                context:
                                  "Billing support from account purchases panel",
                              }),
                            )
                          }
                          className={secondaryButtonClass}
                        >
                          Billing support
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 5).map((order) => (
                        <div
                          key={order.orderId}
                          className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-950">
                              {order.packageId}
                            </p>
                            <p className="text-xs text-slate-500">
                              {order.status}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>
                              {formatOrderAmount(order.amount, order.currency)}
                            </span>
                            <span>{formatOrderDate(order.createdAt)}</span>
                            <span>{order.orderId}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => router.push("/orders")}
                      className={secondaryButtonClass}
                    >
                      All orders
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          buildSupportPath({
                            topic: "billing",
                            context:
                              "Billing support from account purchases panel",
                          }),
                        )
                      }
                      className={secondaryButtonClass}
                    >
                      Billing support
                    </button>
                  </div>
                </SurfacePanel>

                <SurfacePanel
                  className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                  appearance="light"
                  accent="blue"
                >
                  <div>
                    <p className={sectionEyebrowClass}>Save</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Save these choices here and to your account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    className={primaryButtonClass}
                  >
                    Save to account
                  </button>
                </SurfacePanel>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
