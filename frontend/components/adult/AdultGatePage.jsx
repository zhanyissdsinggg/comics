"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontInfoCardClass,
  storefrontSoftCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
import { StorefrontPage } from "../storefront/StorefrontScaffold";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import LoginGateModal from "../layout/LoginGateModal";
import AgeGateModal from "../layout/AgeGateModal";
import { trackEvent } from "../../lib/trackEvent";
import {
  ADULT_GATE_ACTION_LABELS,
  ADULT_GATE_DESCRIPTIONS,
  ADULT_GATE_TITLES,
} from "../../lib/adultGateCopy";

const GATE_STEPS = {
  NEED_LOGIN: {
    icon: UserRound,
    eyebrow: "Account check",
    support:
      "Sign in first. Mature titles stay hidden for signed-out visitors.",
  },
  NEED_AGE_CONFIRM: {
    icon: ShieldCheck,
    eyebrow: "Age check",
    support:
      "Confirm once for this region and this device before opening mature titles.",
  },
  NEED_ADULT_MODE: {
    icon: LockKeyhole,
    eyebrow: "Visibility check",
    support:
      "You already meet access requirements. Turn Mature Mode on to continue.",
  },
};

export default function AdultGatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, signIn } = useAuthStore();
  const {
    confirmAge,
    ageRuleKey,
    legalAge,
    requestAdultToggle,
  } = useAdultGateStore();
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");

  const reason = searchParams.get("reason") || "NEED_ADULT_MODE";
  const returnTo = searchParams.get("returnTo") || "/adult";
  const gateStep = GATE_STEPS[reason] || GATE_STEPS.NEED_ADULT_MODE;
  const GateIcon = gateStep.icon;

  const titleMap = useMemo(() => ADULT_GATE_TITLES, []);
  const descriptionMap = useMemo(() => ADULT_GATE_DESCRIPTIONS, []);

  const handleLogin = async ({ email, password, mode }) => {
    trackEvent("adult_gate_login", { reason });
    const response = await signIn(email, password, mode);
    if (response?.status === 202) {
      setAuthError("");
      return response;
    }
    if (!response.ok) {
      setAuthError("Invalid email or password.");
      return response;
    }
    const status = requestAdultToggle(true);
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return response;
    }
    trackEvent("adult_gate_enabled", { reason });
    router.replace(returnTo);
    return response;
  };

  const handleAgeConfirm = async (ruleKey) => {
    trackEvent("adult_gate_confirm", { reason, ruleKey });
    const status = await confirmAge(ruleKey);
    if (status === "NEED_LOGIN") {
      setActiveModal("login");
      return;
    }
    if (status !== "OK") {
      return;
    }
    trackEvent("adult_gate_enabled", { reason });
    router.replace(returnTo);
  };

  const handleEnableAdult = () => {
    const status = requestAdultToggle(true);
    if (status === "NEED_LOGIN") {
      setActiveModal("login");
      return;
    }
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    if (status === "OK") {
      trackEvent("adult_gate_enabled", { reason });
      router.replace(returnTo);
    }
  };

  const handleOpen = () => {
    if (reason === "NEED_LOGIN") {
      setActiveModal("login");
      return;
    }
    if (reason === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    handleEnableAdult();
  };

  useEffect(() => {
    trackEvent("adult_gate_blocked", {
      source: "adult-gate-page",
      reason,
      returnTo,
    });
  }, [reason, returnTo]);

  return (
    <StorefrontPage accentClass="from-[rgba(255,79,154,0.16)] via-[rgba(167,139,250,0.1)] to-[rgba(103,232,249,0.12)]">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_340px]">
          <SurfacePanel
            appearance="dark"
            tone="highlight"
            accent="rose"
            className="p-0"
          >
            <div className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/58">
                    {gateStep.eyebrow}
                  </p>
                  <h1 className="max-w-[12ch] font-display text-[2.2rem] font-semibold leading-[0.92] tracking-[-0.065em] text-white sm:text-[2.9rem]">
                    {titleMap[reason]}
                  </h1>
                </div>
                <div className={`inline-flex size-12 items-center justify-center rounded-2xl ${storefrontSoftCardClass} px-0 text-[#ffd8e6]`}>
                  <GateIcon className="size-5" />
                </div>
              </div>

              <p className="mt-4 max-w-[40rem] text-sm leading-[1.72] text-white/72 sm:text-[15px]">
                {descriptionMap[reason]}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleOpen}
                  className={storefrontPrimaryButtonClass}
                >
                  {ADULT_GATE_ACTION_LABELS[reason] || "Continue"}
                </button>
                <Link href="/" className={storefrontSecondaryButtonClass}>
                  Back to home
                </Link>
              </div>

              <p className="mt-4 text-sm leading-[1.68] text-white/54">
                Standard browsing keeps all-ages stories visible. After access
                is complete, Mature Mode switches home, search, rankings,
                library, and reader to adult-only content.
              </p>
            </div>
          </SurfacePanel>

          <SurfacePanel appearance="dark" tone="muted" accent="cyan">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/56">
                Before you continue
              </p>
              <div className="space-y-3">
                <div className={`${storefrontInfoCardClass} p-4`}>
                  <p className="text-sm font-medium text-white">18+ only</p>
                  <p className="mt-2 text-sm leading-[1.68] text-white/66">
                    Mature content uses access controls and noindex rules.
                  </p>
                </div>
                <div className={`${storefrontInfoCardClass} p-4`}>
                  <p className="text-sm font-medium text-white">
                    Separate mode
                  </p>
                  <p className="mt-2 text-sm leading-[1.68] text-white/66">
                    Adult mode is isolated and mutually exclusive. The two modes
                    never mix on the same surfaces.
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-[0_18px_36px_rgba(8,6,20,0.18)]">
                  <p className="text-sm font-medium text-white">This step</p>
                  <p className="mt-2 text-sm leading-[1.68] text-white/66">
                    {gateStep.support}
                  </p>
                </div>
              </div>
              {isSignedIn && reason === "NEED_LOGIN" ? (
                <p className="text-xs text-white/56">
                  You are already signed in. Continue to finish access setup.
                </p>
              ) : null}
              {reason === "NEED_AGE_CONFIRM" ? (
                <p className="text-xs leading-[1.6] text-white/56">
                  Current regional requirement: {legalAge}+.
                </p>
              ) : null}
            </div>
          </SurfacePanel>
        </section>
      <LoginGateModal
        open={activeModal === "login"}
        onClose={() => {
          setActiveModal(null);
          setAuthError("");
        }}
        onSubmit={handleLogin}
        errorMessage={authError}
      />
      <AgeGateModal
        open={activeModal === "age"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleAgeConfirm}
        ageRuleKey={ageRuleKey}
        legalAge={legalAge}
      />
    </StorefrontPage>
  );
}
