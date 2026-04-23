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
    "border-[3px] border-black bg-[#ff007a] px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#e1006d] hover:shadow-none";
  const secondaryButtonClass =
    "border-[3px] border-black bg-white px-5 py-2.5 text-sm font-black uppercase tracking-[0.06em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[#ffe500] hover:shadow-none";

  return (
    <div className="gush-home-shell min-h-screen overflow-hidden text-black">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 pt-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <section className="border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] sm:p-7">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-black/55">
              18+ access
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="border-[3px] border-black bg-[#ffe500] px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-black">
                Private
              </span>
              <span className="border-[3px] border-black bg-[#00e5ff] px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-black">
                One check
              </span>
              <span className="border-[3px] border-black bg-[#fff6c7] px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-black">
                Easy off
              </span>
            </div>
            <h1 className="mt-5 text-[2.1rem] font-black uppercase tracking-[-0.05em] text-black sm:text-[2.6rem]">
              {titleMap[reason]}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-black/68">
              {descriptionMap[reason]}
            </p>

            <div className="mt-5 border-[3px] border-black bg-[#f5f1ea] px-4 py-4 text-left shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                Next
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-black/68">
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
              <p className="mt-4 text-xs font-medium text-black/58">
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
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/55">
                Access desk
              </p>
              <div>
                <h2 className="text-[1.7rem] font-black uppercase tracking-[-0.05em] text-black">
                  18+ stays separate until you ask.
                </h2>
                <p className="mt-3 text-sm font-medium leading-7 text-black/68">
                  Sign in if needed, confirm once, then return to the page you
                  meant to open.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-black/68">
              <div className="border-[3px] border-black bg-white px-4 py-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/55">
                  Return target
                </p>
                <p className="mt-2 break-all text-sm font-medium text-black/78">
                  {returnTo}
                </p>
              </div>
              <div className="border-[3px] border-black bg-white px-4 py-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/55">
                  Current reason
                </p>
                <p className="mt-2 text-sm font-medium text-black/78">
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
