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
    "rounded-full border border-black bg-black px-5 py-2.5 text-sm font-semibold tracking-[0.01em] text-white shadow-[0_18px_42px_rgba(15,23,42,0.18)] transition-all hover:bg-black/90";
  const secondaryButtonClass =
    "rounded-full border border-black/12 bg-white px-5 py-2.5 text-sm font-semibold tracking-[0.01em] text-black shadow-[0_14px_32px_rgba(15,23,42,0.10)] transition-all hover:border-black/20 hover:bg-black/[0.03]";

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f7f9] text-black">
      <SiteHeader variant="home" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 pt-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <section className="rounded-[36px] border border-black/10 bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.08)] sm:p-7">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-black/45">
              18+ access
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-black">
                Private
              </span>
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-black">
                One check
              </span>
              <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-black">
                Easy off
              </span>
            </div>
            <h1 className="mt-5 text-[2.1rem] font-black uppercase tracking-[-0.05em] text-black sm:text-[2.6rem]">
              {titleMap[reason]}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-black/68">
              {descriptionMap[reason]}
            </p>

            <div className="mt-5 rounded-[28px] border border-black/10 bg-black/[0.03] px-4 py-4 text-left shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                Access
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-black/68">
                Sign in if needed, confirm once, then return.
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
                Signed in. Finish the 18+ check.
              </p>
            ) : null}
          </section>

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-6 border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
                Access desk
              </p>
              <div>
                <h2 className="text-[1.7rem] font-black uppercase tracking-[-0.05em] text-black">
                  18+ stays separate.
                </h2>
                <p className="mt-3 text-sm font-medium leading-7 text-black/68">
                  Sign in if needed, confirm once, then return.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-black/68">
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] px-4 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/45">
                  Return target
                </p>
                <p className="mt-2 break-all text-sm font-medium text-black/78">
                  {returnTo}
                </p>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-black/[0.03] px-4 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/45">
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
