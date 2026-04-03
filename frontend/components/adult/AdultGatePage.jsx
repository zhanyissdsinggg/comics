"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import SurfacePanel from "../common/SurfacePanel";
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

export default function AdultGatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, signIn } = useAuthStore();
  const {
    confirmAge,
    enableAdultMode,
    ageRuleKey,
    legalAge,
    requestAdultToggle,
  } = useAdultGateStore();
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");

  const reason = searchParams.get("reason") || "NEED_ADULT_MODE";
  const returnTo = searchParams.get("returnTo") || "/adult";

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
      return;
    }
    const status = requestAdultToggle(true);
    if (status === "NEED_AGE_CONFIRM") {
      setActiveModal("age");
      return;
    }
    trackEvent("adult_gate_enabled", { reason });
    router.replace(returnTo);
    return response;
  };

  const handleAgeConfirm = (ruleKey) => {
    trackEvent("adult_gate_confirm", { reason, ruleKey });
    confirmAge(ruleKey);
    trackEvent("adult_gate_enabled", { reason });
    router.replace(returnTo);
  };

  const handleEnableAdult = () => {
    trackEvent("adult_gate_enabled", { reason });
    enableAdultMode();
    router.replace(returnTo);
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
    trackEvent("adult_gate_blocked", { source: "adult-gate-page", reason, returnTo });
  }, [reason, returnTo]);

  return (
    <div className="gush-home-shell min-h-screen overflow-hidden text-slate-900">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 pt-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <section className="rounded-[32px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] p-6 shadow-[0_22px_52px_rgba(15,23,42,0.08)] sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              18+ access
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-black/8 bg-white/84 px-3 py-1 text-xs text-slate-600">
                Private by default
              </span>
              <span className="rounded-full border border-black/8 bg-white/84 px-3 py-1 text-xs text-slate-600">
                One quick check
              </span>
              <span className="rounded-full border border-black/8 bg-white/84 px-3 py-1 text-xs text-slate-600">
                Easy to turn off
              </span>
            </div>
            <h1 className="mt-5 font-display text-[2.1rem] font-semibold tracking-tight text-slate-950 sm:text-[2.6rem]">
              {titleMap[reason]}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{descriptionMap[reason]}</p>

            <div className="mt-5 rounded-[24px] border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.06)] px-4 py-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                What happens next
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Sign in if needed, confirm your age once, then return to the page you came from.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleOpen}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {ADULT_GATE_ACTION_LABELS[reason] || "Continue"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-full border border-black/8 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
              >
                Back to all titles
              </button>
            </div>

            {isSignedIn && reason === "NEED_LOGIN" ? (
              <p className="mt-4 text-xs text-slate-500">
                You're already signed in on this device. Continue to finish the 18+ check.
              </p>
            ) : null}
          </section>

          <SurfacePanel tone="muted" accent="blue" className="flex h-full flex-col justify-between space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/42">
                Access desk
              </p>
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-white">
                  18+ titles stay separate until you ask for them.
                </h2>
                <p className="mt-3 text-sm leading-7 text-neutral-300">
                  This gate keeps mature reading private by default. Sign in if needed, confirm age once, then return right back to the page you meant to open.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-neutral-300">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/46">
                  Return target
                </p>
                <p className="mt-2 break-all text-sm text-white/86">{returnTo}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/46">
                  Current reason
                </p>
                <p className="mt-2 text-sm text-white/86">{reason.replaceAll("_", " ")}</p>
              </div>
            </div>
          </SurfacePanel>
        </section>
      </main>

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
    </div>
  );
}
