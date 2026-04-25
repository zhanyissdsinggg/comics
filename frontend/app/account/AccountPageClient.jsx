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
          hint: "Sign in to sync.",
        },
        {
          label: "Saved now",
          value: "Local",
          hint: "Settings and alerts.",
        },
        {
          label: "Point packs",
          value: "One-time",
          hint: "Flexible unlocks.",
        },
        {
          label: "Membership",
          value: "Monthly",
          hint: "Monthly access.",
        },
      ];
    }

    return [
      {
        label: "Status",
        value: "Signed in",
        hint: !hydrated
          ? "Loading."
          : user?.emailVerified
            ? "Synced."
            : "Verify your email.",
      },
      {
        label: "Membership",
        value: subscription?.active ? "Member" : "Free",
        hint: subscription?.renewAt
          ? `Renews ${new Date(subscription.renewAt).toLocaleDateString()}`
          : !hydrated
            ? "Loading."
            : "Upgrade anytime.",
      },
      {
        label: "Saved here",
        value: regionConfig.label,
        hint: `${language.toUpperCase()} | ${regionConfig.legalAge}+ age check`,
      },
      {
        label: "Orders",
        value: !hydrated
          ? "Loading"
          : ordersLoading
            ? "Loading"
            : orders.length > 0
              ? orders.length.toLocaleString()
              : "None yet",
        hint: ordersLoading
          ? "Loading."
          : "Charges.",
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

  const actionSecondaryButtonClass =
    "inline-flex min-h-[44px] items-center justify-center rounded-full border border-black/12 bg-white px-4 py-2 text-xs font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all hover:border-black/18 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50";
  const actionPrimaryButtonClass =
    "inline-flex min-h-[48px] items-center justify-center rounded-full border border-black bg-black px-5 py-3 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-all hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50";

  const accountActionCards = useMemo(() => {
    if (!viewerSignedIn) {
      return [
        {
          id: "signin",
          eyebrow: "Account",
          title: "Sign in.",
          description: "",
          cta: "Sign in",
          onClick: openAuthPrompt,
          accentClass: actionPrimaryButtonClass,
        },
        {
          id: "recover",
          eyebrow: "Recovery",
          title: "Reset password.",
          description: "",
          cta: "Reset password",
          onClick: () => router.push("/auth/reset"),
          accentClass: actionSecondaryButtonClass,
        },
        {
          id: "membership",
          eyebrow: "Membership",
          title: "Plans.",
          description: "",
          cta: "Plans",
          onClick: () =>
            router.push(
              buildPathWithAttribution("/subscribe", {
                entryPoint: "ACCOUNT_ACTIONS",
                sourcePath: "/account",
                returnTo: "/account",
              }),
            ),
          accentClass: actionSecondaryButtonClass,
        },
        {
          id: "store",
          eyebrow: "Point packs",
          title: "Point packs.",
          description: "",
          cta: "Point packs",
          onClick: () => router.push("/store"),
          accentClass: actionSecondaryButtonClass,
        },
      ];
    }

    return [
      {
        id: "membership",
        eyebrow: "Membership",
        title: "Membership.",
        description: subscription?.active
          ? subscription?.renewAt
            ? `Renews ${new Date(subscription.renewAt).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                },
              )}.`
            : "Active."
          : "",
        cta: subscription?.active ? "Membership" : "Plans",
        onClick: () =>
          router.push(
            buildPathWithAttribution("/subscribe", {
              entryPoint: "ACCOUNT_ACTIONS",
              sourcePath: "/account",
              returnTo: "/account",
            }),
          ),
        accentClass: actionPrimaryButtonClass,
      },
      {
        id: "purchases",
        eyebrow: "Purchases",
        title: "Orders.",
        description: "",
        cta: "Orders",
        onClick: () => router.push("/orders"),
        accentClass: actionSecondaryButtonClass,
      },
      {
        id: "library",
        eyebrow: "Reading",
        title: "Library.",
        description: "",
        cta: "Library",
        onClick: () => router.push("/library"),
        accentClass: actionSecondaryButtonClass,
      },
      {
        id: "support",
        eyebrow: "Support",
        title: "Support.",
        description: "",
        cta: "Support",
        onClick: () =>
          router.push(
            buildSupportPath({
              topic: "account",
              context: "Account help",
            }),
          ),
        accentClass: actionSecondaryButtonClass,
      },
    ];
  }, [
    actionPrimaryButtonClass,
    actionSecondaryButtonClass,
    openAuthPrompt,
    orders.length,
    router,
    subscription?.active,
    subscription?.renewAt,
    viewerSignedIn,
  ]);

  const sectionEyebrowClass =
    "text-[11px] font-black uppercase tracking-[0.24em] text-black/55";
  const sectionTitleClass =
    "font-display text-2xl font-black uppercase tracking-[-0.05em] text-black";
  const mutedCopyClass = "text-sm font-semibold leading-6 text-black/72";
  const fieldLabelClass =
    "text-[11px] font-black uppercase tracking-[0.24em] text-black/55";
  const fieldClass =
    "mt-2 w-full rounded-[22px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black outline-none transition placeholder:text-black/35 shadow-[0_10px_24px_rgba(15,23,42,0.06)] focus:border-black/18 focus:bg-white focus:ring-4 focus:ring-black/5";
  const secondaryButtonClass =
    "inline-flex min-h-[44px] items-center justify-center rounded-full border border-black/12 bg-white px-4 py-2 text-xs font-semibold tracking-[0.02em] text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all hover:border-black/18 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50";
  const primaryButtonClass =
    "inline-flex min-h-[48px] items-center justify-center rounded-full border border-black bg-black px-5 py-3 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-all hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50";
  const highlightCardClass =
    "rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 text-sm font-semibold text-black/72 shadow-[0_18px_40px_rgba(15,23,42,0.08)]";
  const softInfoCardClass =
    "rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#f9fafb_100%)] p-4 text-sm font-semibold text-black/60 shadow-[0_16px_36px_rgba(15,23,42,0.06)]";
  const orderCardClass =
    "rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)]";
  const checkboxClass =
    "h-4 w-4 rounded-none border-[2px] border-black bg-white text-black focus:ring-0";
  const checkboxCardClass =
    "flex items-center gap-3 rounded-[24px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/72 shadow-[0_16px_36px_rgba(15,23,42,0.08)]";
  const messageIsError = /failed|couldn't|not found/i.test(message);
  const accountDeskTitle = viewerSignedIn
    ? "Account."
    : "Local.";
  const accountDeskCopy = viewerSignedIn
    ? orders.length > 0
      ? "Orders, plans, support."
      : "Settings."
    : "Local settings.";

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
      <SiteHeader variant="home" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Account"
            title={viewerSignedIn ? "Account." : "Local."}
            description={
              viewerSignedIn
                ? "Reading, orders, and security."
                : "Local settings."
            }
            secondary={viewerSignedIn ? "" : "Sign in to sync."}
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
                  {viewerSignedIn ? "Membership" : "Reset password"}
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
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                Desk
              </p>
              <div>
                <h2 className="font-display text-[1.9rem] font-black uppercase tracking-[-0.05em] text-black">
                  {accountDeskTitle}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-black/72">
                  {accountDeskCopy}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {viewerSignedIn ? (
                <>
                  <button
                  type="button"
                  onClick={() => router.push("/library")}
                  className={primaryButtonClass}
                >
                  Library
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        buildSupportPath({
                          topic: "account",
                          context: "Account help",
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
              <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.05em] text-black">
                Sign in.
              </h2>
              <h3 className="mt-3 text-lg font-black tracking-[-0.02em] text-black">
                This device, for now.
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/72">
                Sync settings and orders.
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
                      context: "Account help",
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
                ? "border border-rose-200/80 bg-[linear-gradient(180deg,#fff6f8_0%,#fff1f3_100%)] shadow-[0_18px_40px_rgba(244,63,94,0.08)]"
                : "border border-amber-200/80 bg-[linear-gradient(180deg,#fffdf7_0%,#fff8eb_100%)] shadow-[0_18px_40px_rgba(245,158,11,0.08)]"
            }
          >
            <p
              className={`text-sm font-semibold ${messageIsError ? "text-red-600" : "text-black/72"}`}
            >
              {message}
            </p>
          </SurfacePanel>
        ) : null}

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="space-y-2">
            <p className={sectionEyebrowClass}>Actions</p>
            <h2 className={sectionTitleClass}>Actions.</h2>
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
                  <h2 className={sectionTitleClass}>Local.</h2>
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
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-black/55">
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
                    18+ settings
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
                      <div className={`${fieldClass} text-black/68`}>
                        {user?.email || user?.id || "Active account"}
                      </div>
                    )}
                  </div>
                </div>

                {hydrated && isSignedIn ? (
                  <div className={highlightCardClass}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        Email status:{" "}
                        <span className="font-black uppercase tracking-[0.06em] text-black">
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
                      <div className="mt-2 text-xs font-semibold text-black/68">
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
                          context: "Account help",
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
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-black/55">
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
                    18+ settings
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
                  {viewerSignedIn ? "Alerts" : "Device alerts"}
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
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/72">
                      Settings only.
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
                  <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-semibold text-black/72">
                    <div>
                      <div className={fieldLabelClass}>Current plan</div>
                      <div className="mt-1 text-sm font-black uppercase tracking-[0.04em] text-black">
                        {subscriptionLabel}
                      </div>
                      {subscription?.renewAt ? (
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-black/55">
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
                        Membership
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
                              response.error || "Couldn't end membership.",
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
                  </div>

                  {hydrated && isSignedIn ? (
                    <div className={`space-y-3 ${highlightCardClass}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>Email/password</span>
                        <span
                          className={
                            providers.password
                              ? "text-black font-black uppercase tracking-[0.08em]"
                              : "text-black/55"
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
                                ? "text-black font-black uppercase tracking-[0.08em]"
                                : "text-black/55"
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
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-black/55">
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
                    <div className="text-xs font-semibold text-black/68">
                      {securityStatus}
                    </div>
                  ) : null}
                  {providerStatus ? (
                    <div className="text-xs font-semibold text-black/68">
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
                    <h2 className={sectionTitleClass}>Orders</h2>
                  </div>
                  {!hydrated || ordersLoading ? (
                    <div
                      className={`space-y-3 ${softInfoCardClass}`}
                      aria-hidden="true"
                    >
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div
                          key={index}
                          className="rounded-[20px] border border-black/10 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
                        >
                          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
                          <div className="mt-3 h-3 w-40 animate-pulse rounded-full bg-slate-100" />
                          <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className={softInfoCardClass}>
                      <p>No orders yet.</p>
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
                                context: "Billing help",
                              }),
                            )
                          }
                          className={secondaryButtonClass}
                        >
                          Support
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 5).map((order) => (
                        <div
                          key={order.orderId}
                          className={orderCardClass}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black uppercase tracking-[0.04em] text-black">
                              {order.packageId}
                            </p>
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-black/55">
                              {order.status}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-black/55">
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
                            context: "Billing help",
                          }),
                        )
                      }
                      className={secondaryButtonClass}
                    >
                      Support
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
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/72">
                      Save here.
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
