"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
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

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 pt-4 xl:grid-cols-1 xl:items-start">
          <SurfacePanel appearance="dark" tone="muted" accent="cyan" className="p-6 sm:p-7">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/70">
              18+
            </p>
            <h1 className="mt-5 text-[2.1rem] font-black uppercase tracking-[-0.05em] text-white sm:text-[2.6rem]">
              {titleMap[reason]}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/80">
              {descriptionMap[reason]}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleOpen}
                className={storefrontPrimaryButtonClass}
              >
                {ADULT_GATE_ACTION_LABELS[reason] || "Keep Going"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className={storefrontSecondaryButtonClass}
              >
                Back
              </button>
            </div>

            {isSignedIn && reason === "NEED_LOGIN" ? (
              <p className="mt-4 text-xs font-semibold text-white/70">
                You're signed in. Confirm and keep going.
              </p>
            ) : null}
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
