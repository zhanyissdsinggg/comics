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
import { formatUSDisplayCurrencyFromCents } from "../../lib/localization";
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
  return formatUSDisplayCurrencyFromCents(numericAmount, currency);
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
  const openRegisterPrompt = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("auth:open", {
          detail: { returnTo: "/account", mode: "register" },
        }),
      );
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
      setMessage("Saved on this device.");
    }
  };

  const handleRequestPasswordReset = async () => {
    setSecurityStatus("");
    const email = user?.email || "";
    if (!email) {
      setSecurityStatus("No email found. Sign in again.");
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
          hint: "Sign in to save your reading.",
        },
        {
          label: "Access",
          value: "Ready",
          hint: "Sign in or create an account",
        },
        {
          label: "Support",
          value: "Help",
          hint: "Reset password or contact support",
        },
      ];
    }

    return [
      {
        label: "Status",
        value: "Signed in",
          hint: !hydrated
          ? "Loading"
          : user?.emailVerified
            ? "Synced"
            : "Verify your email",
      },
      {
        label: "Plans",
        value: subscription?.active ? "Member" : "Free",
        hint: subscription?.renewAt
          ? `Renews ${new Date(subscription.renewAt).toLocaleDateString()}`
          : !hydrated
            ? "Loading"
            : "Upgrade anytime",
      },
      {
        label: "Region",
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
          ? "Loading"
          : "Billing",
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
    "inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-white/20 bg-black px-4 py-2 text-xs font-semibold tracking-[0.02em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50";
  const actionPrimaryButtonClass =
    "inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-black bg-[#00E5FF] px-5 py-3 text-sm font-semibold tracking-[0.02em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50";

  const accountActionCards = useMemo(() => {
    if (!viewerSignedIn) {
      return [
        {
          id: "signin",
          eyebrow: "Account",
          title: "Sign in",
          description: "",
          cta: "Sign in",
          onClick: openAuthPrompt,
          accentClass: actionPrimaryButtonClass,
        },
        {
          id: "create-account",
          eyebrow: "New here?",
          title: "Create account",
          description: "",
          cta: "Create account",
          onClick: openRegisterPrompt,
          accentClass: actionSecondaryButtonClass,
        },
        {
          id: "recover",
          eyebrow: "Recovery",
          title: "Reset password",
          description: "",
          cta: "Reset password",
          onClick: () => router.push("/auth/reset"),
          accentClass: actionSecondaryButtonClass,
        },
        {
          id: "support",
          eyebrow: "Support",
          title: "Support",
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
    }

    return [
      {
        id: "membership",
        eyebrow: "Plans",
        title: "Plans",
        description: subscription?.active
          ? subscription?.renewAt
            ? `Renews ${new Date(subscription.renewAt).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                },
              )}`
            : "Active"
          : "",
          cta: subscription?.active ? "Plans" : "See plans",
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
          title: "Orders",
          description: "",
          cta: "Orders",
        onClick: () => router.push("/orders"),
        accentClass: actionSecondaryButtonClass,
      },
        {
          id: "library",
          eyebrow: "Reading",
          title: "Library",
          description: "",
          cta: "Library",
        onClick: () => router.push("/library"),
        accentClass: actionSecondaryButtonClass,
      },
        {
          id: "support",
          eyebrow: "Support",
          title: "Support",
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
    openRegisterPrompt,
    orders.length,
    router,
    subscription?.active,
    subscription?.renewAt,
    viewerSignedIn,
  ]);

  const sectionEyebrowClass =
    "text-[11px] font-black uppercase tracking-[0.24em] text-white/60";
  const sectionTitleClass =
    "font-display text-2xl font-black uppercase tracking-[-0.05em] text-white";
  const mutedCopyClass = "text-sm font-semibold leading-6 text-white/70";
  const fieldLabelClass =
    "text-[11px] font-black uppercase tracking-[0.24em] text-white/60";
  const fieldClass =
    "mt-2 w-full rounded-[22px] border-2 border-white/20 bg-black px-4 py-3 text-sm font-semibold text-white outline-none transition-transform duration-150 placeholder:text-white/35 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:border-[#00E5FF]/60 focus:ring-4 focus:ring-[#00E5FF]/15";
  const secondaryButtonClass =
    "inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-white/20 bg-black px-4 py-2 text-xs font-semibold tracking-[0.02em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50";
  const primaryButtonClass =
    "inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-black bg-[#00E5FF] px-5 py-3 text-sm font-semibold tracking-[0.02em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 hover:translate-x-0.5 hover:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50";
  const highlightCardClass =
    "rounded-[24px] border-2 border-white/15 bg-black px-4 py-4 text-sm font-semibold text-white/70 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";
  const softInfoCardClass =
    "rounded-[24px] border-2 border-white/15 bg-black p-4 text-sm font-semibold text-white/60 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
  const orderCardClass =
    "rounded-[24px] border-2 border-white/15 bg-black p-4 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";
  const checkboxClass =
    "h-4 w-4 rounded-none border-[2px] border-white/30 bg-black text-[#00E5FF] focus:ring-0";
  const checkboxCardClass =
    "flex items-center gap-3 rounded-[24px] border-2 border-white/15 bg-black px-4 py-3 text-sm font-semibold text-white/70 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
  const messageIsError = /failed|couldn't|not found/i.test(message);
  const accountDeskTitle = viewerSignedIn
    ? "Account"
    : "Need help?";
  const accountDeskCopy = viewerSignedIn
    ? orders.length > 0
      ? "Orders, plans, support"
      : "Settings"
    : "Reset your password or get support.";

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <SiteHeader variant="home" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow="Account"
            title="Account"
            description={
              viewerSignedIn
                ? "Reading, orders, security"
                : "Sign in to save progress and favorites."
            }
            secondary=""
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
                      openRegisterPrompt();
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
                  {viewerSignedIn ? "Plans" : "Create account"}
                </button>
              </>
            }
          />

          <SurfacePanel
            tone="muted"
            accent="cyan"
            appearance="dark"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                Desk
              </p>
              <div>
                <h2 className="font-display text-[1.9rem] font-black uppercase tracking-[-0.05em] text-white">
                  {accountDeskTitle}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-white/70">
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
                    onClick={() => router.push("/auth/reset")}
                    className={primaryButtonClass}
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

        {message ? (
          <SurfacePanel
            appearance="dark"
            accent={messageIsError ? "rose" : "amber"}
            className={
              messageIsError
                ? "border-2 border-[#FF007A] bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                : "border-2 border-[#FFE500] bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            }
          >
            <p
              className={`text-sm font-semibold ${messageIsError ? "text-[#FF007A]" : "text-white/78"}`}
            >
              {message}
            </p>
          </SurfacePanel>
        ) : null}

        <SurfacePanel className="space-y-5" appearance="dark" accent="cyan">
          <div className="space-y-2">
            <p className={sectionEyebrowClass}>
              {viewerSignedIn ? "Actions" : "Account access"}
            </p>
            <h2 className={sectionTitleClass}>
              {viewerSignedIn ? "Actions." : "Sign in, recover, or get help"}
            </h2>
          </div>
          <StorefrontPathwaysGrid
            cards={accountActionCards}
            columnsClassName="md:grid-cols-2 xl:grid-cols-4"
            appearance="dark"
          />
        </SurfacePanel>

        {viewerSignedIn ? (
          <MyLibraryPanel
            viewerSignedIn={viewerSignedIn}
            onOpenAuth={openAuthPrompt}
          />
        ) : null}

        {hydrated && isSignedIn ? <ReadingStats /> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            {viewerSignedIn ? null : (
              <SurfacePanel
                className="space-y-4"
                appearance="dark"
                accent="cyan"
              >
                <details className="group rounded-[24px] border-2 border-white/15 bg-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div>
                      <p className={sectionEyebrowClass}>Device settings</p>
                      <h2 className="mt-2 text-lg font-black uppercase tracking-[-0.03em] text-white">
                        Local preferences
                      </h2>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60 transition group-open:text-white">
                      Expand
                    </span>
                  </summary>

                  <div className="mt-5 space-y-5">
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
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
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

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className={sectionEyebrowClass}>Device settings</p>
                        <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-white">
                          Alerts
                        </h3>
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
                        Free read alerts
                      </label>
                      <label className={checkboxCardClass}>
                        <input
                          type="checkbox"
                          checked={notifyPromo}
                          onChange={(event) => setNotifyPromo(event.target.checked)}
                          className={checkboxClass}
                        />
                        Deals and offers
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => router.push("/mature-content")}
                        className={secondaryButtonClass}
                      >
                        Mature content settings
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className={primaryButtonClass}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </details>
              </SurfacePanel>
            )}

            {viewerSignedIn ? (
              <SurfacePanel
                className="space-y-5"
                appearance="dark"
                accent="cyan"
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
                      <div className={`${fieldClass} text-white/70`}>
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
                        <span className="font-black uppercase tracking-[0.06em] text-white">
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
                        Send again
                      </button>
                    </div>
                    {verifyStatus ? (
                      <div className="mt-2 text-xs font-semibold text-white/70">
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
                    Region and language
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
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
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

                <div className="rounded-[24px] border-2 border-white/15 bg-black p-4 text-sm font-semibold text-white/70 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  Mature content visibility and 18+ history controls live in a
                  separate settings page.
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/mature-content")}
                    className={secondaryButtonClass}
                  >
                    Mature content settings
                  </button>
                </div>
              </SurfacePanel>
            ) : null}

            {viewerSignedIn ? (
              <SurfacePanel
                className="space-y-4"
                appearance="light"
                accent="blue"
              >
                <div className="space-y-2">
                  <p className={sectionEyebrowClass}>Notifications</p>
                  <h2 className={sectionTitleClass}>Alerts</h2>
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
                  Free read alerts
                </label>
                <label className={checkboxCardClass}>
                  <input
                    type="checkbox"
                    checked={notifyPromo}
                    onChange={(event) => setNotifyPromo(event.target.checked)}
                    className={checkboxClass}
                  />
                  Deals and offers
                </label>
              </SurfacePanel>
            ) : null}
          </div>

          <div className="space-y-6">
            {!viewerSignedIn ? null : (
              <>
                <SurfacePanel
                  className="space-y-4"
                  appearance="light"
                  accent="blue"
                >
                  <div className="space-y-2">
                    <p className={sectionEyebrowClass}>Billing</p>
                    <h2 className={sectionTitleClass}>
                      Billing
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-semibold text-white/70">
                    <div>
                      <div className={fieldLabelClass}>Plan</div>
                      <div className="mt-1 text-sm font-black uppercase tracking-[0.04em] text-white">
                        {subscriptionLabel}
                      </div>
                      {subscription?.renewAt ? (
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
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
                        Plans
                      </button>
                      <button
                        type="button"
                        disabled={!subscription?.active || working === "cancel"}
                        onClick={async () => {
                          setWorking("cancel");
                          const response = await cancelSubscription();
                          if (response.ok) {
                    setMessage("Plan canceled.");
                          } else {
                            setMessage(
                              response.error || "Couldn't end your plan.",
                            );
                          }
                          setWorking("");
                        }}
                        className={secondaryButtonClass}
                      >
                        Cancel plan
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
                      Sign-in and recovery
                    </h2>
                  </div>

                  {hydrated && isSignedIn ? (
                    <div className={`space-y-3 ${highlightCardClass}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>Email/password</span>
                        <span
                          className={
                            providers.password
                              ? "text-white font-black uppercase tracking-[0.08em]"
                              : "text-white/60"
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
                                ? "text-white font-black uppercase tracking-[0.08em]"
                                : "text-white/60"
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
                              setProviderStatus("Google removed.");
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
                              setProviderStatus("Google connected.");
                              await loadAuthProviders();
                            }}
                            onError={(nextMessage) => {
                              setProviderStatus(
                                nextMessage || "Couldn't connect Google.",
                              );
                            }}
                            isLoading={providerBusy}
                          />
                        </div>
                      )}
                    </div>
                  ) : null}

                  {hydrated && isSignedIn && !googleAuthEnabled ? (
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
                      Google login is not configured.
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={!hydrated || !isSignedIn}
                    onClick={handleRequestPasswordReset}
                    className={secondaryButtonClass}
                  >
                    Send reset email
                  </button>
                  {securityStatus ? (
                    <div className="text-xs font-semibold text-white/70">
                      {securityStatus}
                    </div>
                  ) : null}
                  {providerStatus ? (
                    <div className="text-xs font-semibold text-white/70">
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
                          className="rounded-[20px] border-2 border-white/15 bg-black px-4 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
                          <div className="mt-3 h-3 w-40 animate-pulse rounded-full bg-slate-100" />
                          <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className={softInfoCardClass}>
                      <p>No orders yet</p>
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
                            <p className="text-sm font-black uppercase tracking-[0.04em] text-white">
                              {order.packageId}
                            </p>
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
                              {order.status}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
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
                      Orders
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
                    <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
                      Save
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    className={primaryButtonClass}
                  >
                    Save
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
