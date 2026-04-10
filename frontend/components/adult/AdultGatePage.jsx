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
    trackEvent("adult_gate_blocked", {
      source: "adult-gate-page",
      reason,
      returnTo,
    });
  }, [reason, returnTo]);

  const primaryButtonClass =
    "rounded-full border border-slate-950 bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(15,23,42,0.12)] transition-all duration-200 hover:bg-slate-800 hover:shadow-[0_20px_38px_rgba(15,23,42,0.14)]";
  const secondaryButtonClass =
    "rounded-full border border-[color:var(--gush-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--gush-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition-colors hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]";

  return (
    <div className="gush-home-shell min-h-screen overflow-hidden text-slate-900">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 pt-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <section className="rounded-[32px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[0_22px_52px_rgba(15,23,42,0.08)] sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              18+ access
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1 text-xs text-slate-600">
                Private
              </span>
              <span className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1 text-xs text-slate-600">
                One check
              </span>
              <span className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1 text-xs text-slate-600">
                Easy off
              </span>
            </div>
            <h1 className="mt-5 font-display text-[2.1rem] font-semibold tracking-tight text-slate-950 sm:text-[2.6rem]">
              {titleMap[reason]}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              {descriptionMap[reason]}
            </p>

            <div className="mt-5 rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Next
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Sign in if needed, confirm your age once, then return.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleOpen}
                className={primaryButtonClass}
              >
                {ADULT_GATE_ACTION_LABELS[reason] || "Continue"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className={secondaryButtonClass}
              >
                Back to all titles
              </button>
            </div>

            {isSignedIn && reason === "NEED_LOGIN" ? (
              <p className="mt-4 text-xs text-slate-500">
                You're already signed in. Continue to finish the 18+ check.
              </p>
            ) : null}
          </section>

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Access desk
              </p>
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  18+ stays separate until you ask.
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Sign in if needed, confirm once, then return to the page you
                  meant to open.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Return target
                </p>
                <p className="mt-2 break-all text-sm text-slate-800">
                  {returnTo}
                </p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Current reason
                </p>
                <p className="mt-2 text-sm text-slate-800">
                  {reason.replaceAll("_", " ")}
                </p>
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
