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
        <section className="grid gap-5 pt-4 xl:grid-cols-1 xl:items-start">
          <section className="rounded-[36px] border border-black/10 bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.08)] sm:p-7">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-black/45">
              18+
            </p>
            <h1 className="mt-5 text-[2.1rem] font-black uppercase tracking-[-0.05em] text-black sm:text-[2.6rem]">
              {titleMap[reason]}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-black/68">
              {descriptionMap[reason]}
            </p>

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
                Back
              </button>
            </div>

            {isSignedIn && reason === "NEED_LOGIN" ? (
              <p className="mt-4 text-xs font-medium text-black/58">
                Signed in. Continue to confirm.
              </p>
            ) : null}
          </section>
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
