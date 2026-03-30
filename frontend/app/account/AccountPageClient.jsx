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
import { LANGUAGE_OPTIONS, REGION_KEYS, getRegionConfig } from "../../lib/region/config";
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
          applyPreferencesToStorage(payload);
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
        value: !hydrated ? "Loading" : ordersLoading ? "Loading" : orders.length > 0 ? orders.length.toLocaleString() : "None yet",
        hint: ordersLoading
          ? "Recent charges and receipts show up below."
          : "Latest packs and memberships stay close to the rest of your account tools.",
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
          title: "Sign in and keep everything on one account.",
          description:
            "Library progress, purchases, mature-content settings, and recovery details make more sense once they stop living on one device only.",
          cta: "Sign in",
          onClick: openAuthPrompt,
          accentClass:
            "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
        },
        {
          id: "recover",
          eyebrow: "Recovery",
          title: "Lost access? Reset your password.",
          description:
            "Use reset if you signed up with email and password. If billing or sign-in still looks wrong, support is the faster backup path.",
          cta: "Reset password",
          onClick: () => router.push("/auth/reset"),
          accentClass:
            "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
        },
        {
          id: "membership",
          eyebrow: "Membership",
          title: "View monthly plans before you start.",
          description:
            "Membership is the recurring option for regular readers. View the tiers first, then sign in when you are ready to start one.",
          cta: "View Plans",
          onClick: () =>
            router.push(
              buildPathWithAttribution("/subscribe", {
                entryPoint: "ACCOUNT_ACTIONS",
                sourcePath: "/account",
                returnTo: "/account",
              }),
            ),
          accentClass:
            "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
        },
        {
          id: "store",
          eyebrow: "Point packs",
          title: "See one-time packs and current pricing.",
          description:
            "Store is for point packs, not membership. Use it when you want flexible one-off unlocking instead of a monthly plan.",
          cta: "View point packs",
          onClick: () => router.push("/store"),
          accentClass:
            "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
        },
      ];
    }

    return [
      {
        id: "membership",
        eyebrow: "Membership",
        title: subscription?.active ? "Manage renewal and plan details." : "View membership before your next purchase.",
        description: subscription?.active
          ? subscription?.renewAt
            ? `Your plan renews on ${new Date(subscription.renewAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}. Cancellation and billing rules stay in one place.`
            : "Open membership to review renewal timing, monthly perks, and cancellation."
          : "If you keep topping up, membership may fit better before your next pack purchase.",
        cta: subscription?.active ? "Manage membership" : "View Plans",
        onClick: () =>
          router.push(
            buildPathWithAttribution("/subscribe", {
              entryPoint: "ACCOUNT_ACTIONS",
              sourcePath: "/account",
              returnTo: "/account",
            }),
          ),
        accentClass:
          "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-slate-900 hover:border-[rgba(47,107,255,0.2)] hover:bg-[rgba(47,107,255,0.12)]",
      },
      {
        id: "purchases",
        eyebrow: "Purchases",
        title: orders.length > 0 ? "Find receipts and order IDs fast." : "Keep receipts and charges easy to find.",
        description: orders.length > 0
          ? "Purchases is where your latest point packs, membership renewals, and billing records stay easy to review."
          : "After checkout, this is still where pack receipts, membership charges, and order IDs show up.",
        cta: "View purchases",
        onClick: () => router.push("/orders"),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "library",
        eyebrow: "Reading",
        title: "Open your library and keep reading.",
        description:
          "Library keeps saved titles, recent reading, and progress closer than a settings page ever should.",
        cta: "Open library",
        onClick: () => router.push("/library"),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
      },
      {
        id: "support",
        eyebrow: "Support",
        title: "Get account or billing help fast.",
        description:
          "Use Support for sign-in trouble, wrong charges, missing points, or mature-content access issues without hunting through legal pages.",
        cta: "Get help",
        onClick: () => router.push(buildSupportPath({ topic: "account", context: "Account help from account page" })),
        accentClass:
          "border-black/8 bg-white text-slate-900 hover:border-black/12 hover:bg-[#f8f9fc]",
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

  const sectionEyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500";
  const sectionTitleClass = "font-display text-2xl font-semibold tracking-tight text-slate-950";
  const mutedCopyClass = "text-sm leading-6 text-slate-600";
  const fieldLabelClass = "text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500";
  const fieldClass =
    "mt-2 w-full rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[rgba(47,107,255,0.35)] focus:ring-2 focus:ring-[rgba(47,107,255,0.12)]";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-50";
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
  const checkboxClass =
    "h-4 w-4 rounded border-black/12 bg-white text-[var(--gush-accent,#2f6bff)] focus:ring-[rgba(47,107,255,0.22)]";
  const checkboxCardClass =
    "flex items-center gap-3 rounded-[24px] border border-black/8 bg-[#f8f9fc] px-4 py-3 text-sm text-slate-700";
  const messageIsError = /failed|couldn't|not found/i.test(message);

  return (
    <main className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <div className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <EditorialHero
          appearance="light"
          accent="blue"
          eyebrow="Account"
          title={viewerSignedIn ? "Your account, purchases, and reading setup." : "Sign in for receipts and recovery. Keep local reading setup here now."}
          description={
            viewerSignedIn
              ? "Use account for membership, purchases, mature-content controls, and account basics without digging through menus."
              : "Signed-out readers can still save device settings here. Sign in when you want purchases, progress, and recovery tied to one account."
          }
          secondary={
            viewerSignedIn
              ? "Use the task cards first, then save the settings that matter and get back to reading."
              : "Local settings save to this browser. Purchases, library, and billing history start making sense after sign-in."
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
                {viewerSignedIn ? "View purchases" : "Sign in"}
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

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        {!viewerSignedIn ? (
          <SurfacePanel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" appearance="light" accent="blue">
            <div>
              <p className={sectionEyebrowClass}>Signed out</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Sign in to keep purchases, library, and mature-content settings on one account.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                You can still adjust local settings here, but sign-in is what keeps purchases, progress, and account recovery attached to you.
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
                onClick={() => router.push(buildSupportPath({ topic: "account", context: "Signed-out account help" }))}
                className={secondaryButtonClass}
              >
                Get help
              </button>
            </div>
          </SurfacePanel>
        ) : null}

        {message ? (
          <SurfacePanel
            appearance="light"
            accent={messageIsError ? "rose" : "blue"}
            className={
              messageIsError
                ? "border border-red-200 bg-red-50"
                : "border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)]"
            }
          >
            <p className={`text-sm ${messageIsError ? "text-red-600" : "text-slate-700"}`}>{message}</p>
          </SurfacePanel>
        ) : null}

        <SurfacePanel className="space-y-5" appearance="light" accent="blue">
          <div className="space-y-2">
            <p className={sectionEyebrowClass}>What do you need to do?</p>
            <h2 className={sectionTitleClass}>Start with the task, not the settings.</h2>
            <p className={mutedCopyClass}>
              Account should make the next step obvious whether you are here for billing, membership, reading progress,
              or recovery.
            </p>
          </div>
          <StorefrontPathwaysGrid cards={accountActionCards} columnsClassName="md:grid-cols-2 xl:grid-cols-4" appearance="light" />
        </SurfacePanel>

        <MyLibraryPanel viewerSignedIn={viewerSignedIn} onOpenAuth={openAuthPrompt} />

        {hydrated && isSignedIn ? <ReadingStats /> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            {viewerSignedIn ? (
              <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                <div className="space-y-2">
                  <p className={sectionEyebrowClass}>Sync and device settings</p>
                  <h2 className={sectionTitleClass}>What stays on this device, and what follows your account.</h2>
                  <p className={mutedCopyClass}>
                    The page should make this obvious instead of leaving you to guess.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-black/8 bg-[#f8f9fc] px-4 py-4">
                    <p className="text-sm font-semibold text-slate-950">Saved here right away</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Region, language, 18+ history visibility, display name, and alert choices apply to this browser as soon as you save.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] px-4 py-4">
                    <p className="text-sm font-semibold text-slate-950">Also saved to your account after sign-in</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Once you are signed in, we also save these preferences to your account, along with purchases, library, progress, and recovery details.
                    </p>
                  </div>
                </div>
              </SurfacePanel>
            ) : (
              <SurfacePanel className="space-y-5" appearance="light" accent="blue">
                <div className="space-y-2">
                  <p className={sectionEyebrowClass}>Local reading setup</p>
                  <h2 className={sectionTitleClass}>Save device settings now, then add sync later.</h2>
                  <p className={mutedCopyClass}>
                    Signed-out readers should still get useful controls here. These choices save to this browser now and become account-level once you sign in.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-black/8 bg-[#f8f9fc] px-4 py-4">
                    <p className="text-sm font-semibold text-slate-950">Saved here right away</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Region, language, 18+ history visibility, display name, and alerts apply to this browser as soon as you save.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] px-4 py-4">
                    <p className="text-sm font-semibold text-slate-950">Starts syncing after sign-in</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Purchases, library progress, membership history, recovery, and these preferences make more sense once they live on one account.
                    </p>
                  </div>
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
                    <p className="mt-2 text-xs text-slate-500">Legal age: {regionConfig.legalAge}+</p>
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
                    onChange={(event) => setHideAdultHistory(event.target.checked)}
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
              <SurfacePanel className="space-y-5" appearance="light" accent="blue">
                <div className="space-y-2">
                  <p className={sectionEyebrowClass}>Account basics</p>
                  <h2 className={sectionTitleClass}>Name, email, and quick help</h2>
                  <p className={mutedCopyClass}>
                    Keep the basics easy to scan when you need them.
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
                    {!hydrated ? (
                      <div className={`${fieldClass} flex flex-col justify-center gap-2`} aria-hidden="true">
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
                  <div className="rounded-[24px] border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] px-4 py-4 text-sm text-slate-700">
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
                          apiPost("/api/auth/request-verify", { email: user?.email || "" }).then(
                            (response) => {
                              if (response.ok) {
                                setVerifyStatus("Verification email sent.");
                              } else {
                                setVerifyStatus(response.error || "Request failed.");
                              }
                            },
                          );
                        }}
                        className={secondaryButtonClass}
                      >
                        Send another email
                      </button>
                    </div>
                    {verifyStatus ? <div className="mt-2 text-xs text-slate-600">{verifyStatus}</div> : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/orders")}
                    className={secondaryButtonClass}
                  >
                    View purchases
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
                    onClick={() => router.push(buildSupportPath({ topic: "account", context: "Account help from account page" }))}
                    className={secondaryButtonClass}
                  >
                    Get help
                  </button>
                </div>
              </SurfacePanel>
            ) : null}

            {viewerSignedIn ? (
              <SurfacePanel className="space-y-5" appearance="light" accent="blue">
                <div className="space-y-2">
                  <p className={sectionEyebrowClass}>Reading setup</p>
                  <h2 className={sectionTitleClass}>Region, language, and 18+ history</h2>
                  <p className={mutedCopyClass}>
                    Keep these defaults consistent so mature-content access and language feel predictable. They save to this browser immediately and sync to your account after sign-in.
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
                    <p className="mt-2 text-xs text-slate-500">Legal age: {regionConfig.legalAge}+</p>
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
                    onChange={(event) => setHideAdultHistory(event.target.checked)}
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

            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div className="space-y-2">
                <p className={sectionEyebrowClass}>Notifications</p>
                <h2 className={sectionTitleClass}>
                  {viewerSignedIn ? "Only keep the alerts that matter" : "Keep only the alerts you want on this device"}
                </h2>
                <p className={mutedCopyClass}>
                  {viewerSignedIn
                    ? "New chapters, free unlocks, and promos should help you come back, not fill space. These choices save here first and sync to your account when available."
                    : "New chapters, free unlocks, and promos should help you come back, not turn this page into a settings wall. These choices save locally until you sign in."}
                </p>
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
                <SurfacePanel className="space-y-5" appearance="light" accent="blue">
                  <div className="space-y-2">
                    <p className={sectionEyebrowClass}>Signed-out account</p>
                    <h2 className={sectionTitleClass}>Use local settings now. Add sign-in when you want sync.</h2>
                    <p className={mutedCopyClass}>
                      This page should not dump a wall of half-dead controls on signed-out readers. Local reading
                      setup still works now, and sign-in adds purchases, recovery, membership history, and synced
                      progress later.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] border border-black/8 bg-[#f8f9fc] px-4 py-4">
                      <p className="text-sm font-semibold text-slate-950">Works on this device right now</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Region, language, 18+ history, display name, and alerts save here as soon as you hit save.
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] px-4 py-4">
                      <p className="text-sm font-semibold text-slate-950">Starts making sense after sign-in</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Purchases, library progress, membership renewals, password recovery, and billing help all stay attached to one account.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={openAuthPrompt} className={primaryButtonClass}>
                      Sign in
                    </button>
                    <button type="button" onClick={() => router.push("/auth/reset")} className={secondaryButtonClass}>
                      Reset password
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(buildSupportPath({ topic: "account", context: "Signed-out account or billing help" }))}
                      className={secondaryButtonClass}
                    >
                      Get help
                    </button>
                  </div>
                </SurfacePanel>

                <SurfacePanel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" appearance="light" accent="blue">
                  <div>
                    <p className={sectionEyebrowClass}>Save changes</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Save these choices to this device now. Sign in later if you want them tied to your account too.
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
                <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                  <div className="space-y-2">
                    <p className={sectionEyebrowClass}>Membership & billing</p>
                    <h2 className={sectionTitleClass}>Plan, renewal, and cancellation</h2>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
                    <div>
                      <div className={fieldLabelClass}>Current plan</div>
                      <div className="mt-1 text-sm font-semibold text-slate-950">{subscriptionLabel}</div>
                      {subscription?.renewAt ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Renews on {new Date(subscription.renewAt).toLocaleDateString()}
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
                            setMessage(response.error || "Couldn't end the membership.");
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

                <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                  <div className="space-y-2">
                    <p className={sectionEyebrowClass}>Security</p>
                    <h2 className={sectionTitleClass}>Sign-in methods and recovery</h2>
                    <p className={mutedCopyClass}>
                      See which sign-in methods are connected and send a reset email without extra digging.
                    </p>
                  </div>

                  {hydrated && isSignedIn ? (
                    <div className="space-y-3 rounded-[24px] border border-black/8 bg-[#f8f9fc] px-4 py-4 text-sm text-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>Email/password</span>
                        <span className={providers.password ? "text-[var(--gush-accent,#2f6bff)]" : "text-amber-600"}>
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
                          <span className={providers.google ? "text-[var(--gush-accent,#2f6bff)]" : "text-slate-500"}>
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
                            const response = await apiPost("/api/auth/google/unlink");
                            if (response.ok) {
                              setProviderStatus("Google sign-in removed.");
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
                              setProviderStatus("Google sign-in connected.");
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
                    <div className="text-xs text-slate-500">Google login is not configured.</div>
                  ) : null}

                  <button
                    type="button"
                    disabled={!hydrated || !isSignedIn}
                    onClick={handleRequestPasswordReset}
                    className={secondaryButtonClass}
                  >
                    Send password reset email
                  </button>
                  {securityStatus ? <div className="text-xs text-slate-600">{securityStatus}</div> : null}
                  {providerStatus ? <div className="text-xs text-slate-600">{providerStatus}</div> : null}
                </SurfacePanel>

                <SurfacePanel className="space-y-4" appearance="light" accent="blue">
                  <div className="space-y-2">
                    <p className={sectionEyebrowClass}>Purchases</p>
                    <h2 className={sectionTitleClass}>Recent receipts and charges</h2>
                    <p className={mutedCopyClass}>
                      Spot the latest pack or membership charge, then jump into billing help if something looks off.
                    </p>
                  </div>
                  {!hydrated || ordersLoading ? (
                    <div className="space-y-3 rounded-[24px] border border-black/8 bg-[#f8f9fc] p-4" aria-hidden="true">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="rounded-[20px] border border-black/6 bg-white px-4 py-4">
                          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
                          <div className="mt-3 h-3 w-40 animate-pulse rounded-full bg-slate-100" />
                          <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="rounded-[24px] border border-black/8 bg-[#f8f9fc] p-4 text-sm text-slate-500">
                      <p>No purchases yet. Point packs and membership charges will appear here after checkout, along with the order ID you may need later.</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => router.push("/store")}
                          className={secondaryButtonClass}
                        >
                          See point packs
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(buildSupportPath({ topic: "billing", context: "Billing help from account purchases panel" }))}
                          className={secondaryButtonClass}
                        >
                          Billing help
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 5).map((order) => (
                        <div
                          key={order.orderId}
                          className="rounded-[24px] border border-black/8 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-950">{order.packageId}</p>
                            <p className="text-xs text-slate-500">{order.status}</p>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>{formatOrderAmount(order.amount, order.currency)}</span>
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
                      View all purchases
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(buildSupportPath({ topic: "billing", context: "Billing help from account purchases panel" }))}
                      className={secondaryButtonClass}
                    >
                      Billing help
                    </button>
                  </div>
                </SurfacePanel>

                <SurfacePanel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" appearance="light" accent="blue">
                  <div>
                    <p className={sectionEyebrowClass}>Save changes</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Save these choices to this device now and to your signed-in account.
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
      </div>
    </main>
  );
}
