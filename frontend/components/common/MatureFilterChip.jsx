"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import AgeGateModal from "../layout/AgeGateModal";
import LoginGateModal from "../layout/LoginGateModal";
import {
  LOGIN_GATE_DESCRIPTION,
  LOGIN_GATE_TITLE,
} from "../../lib/adultGateCopy";
import { cn } from "@/lib/utils";

export default function MatureFilterChip({
  href,
  onNavigate,
  active = false,
  label = "Mature",
  className = "",
  activeClassName = "",
  inactiveClassName = "",
}) {
  const router = useRouter();
  const { hydrated, isSignedIn, signIn } = useAuthStore();
  const {
    adultConfirmed,
    ageRuleKey,
    legalAge,
    isAdultMode,
    enableAdultMode,
    confirmAge,
  } = useAdultGateStore();
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");

  const handleNavigate = (options = {}) => {
    let handled = false;

    if (typeof onNavigate === "function") {
      const result = onNavigate(options);
      handled = result === false;
    }

    if (handled || !href) {
      return;
    }
    router.push(href);
  };

  const openGate = () => {
    if (!hydrated || !isSignedIn) {
      setActiveModal("login");
      return;
    }

    if (!adultConfirmed) {
      setActiveModal("age");
      return;
    }

    if (!isAdultMode) {
      enableAdultMode();
    }

    handleNavigate();
  };

  const handleLogin = async ({ email, password, mode }) => {
    const response = await signIn(email, password, mode);
    if (response?.status === 202) {
      setAuthError("");
      return response;
    }
    if (!response?.ok) {
      setAuthError("Invalid email or password.");
      return response;
    }

    setAuthError("");
    if (!adultConfirmed) {
      setActiveModal("age");
      return response;
    }

    if (!isAdultMode) {
      enableAdultMode();
    }

    setActiveModal(null);
    handleNavigate({ bypassGate: true });
    return response;
  };

  const handleAgeConfirm = () => {
    confirmAge(ageRuleKey);
    if (!isAdultMode) {
      enableAdultMode();
    }
    setActiveModal(null);
    handleNavigate({ bypassGate: true });
  };

  const buttonClassName = `${className} ${
    active ? activeClassName : inactiveClassName
  }`.trim();
  const sharedClassName = cn(
    "inline-flex items-center justify-center rounded-full",
    buttonClassName,
  );

  return (
    <>
      {active && href ? (
        <Link href={href} className={sharedClassName}>
          {label}
        </Link>
      ) : (
        <button
          type="button"
          onClick={openGate}
          className={sharedClassName}
          aria-pressed={active}
        >
          {label}
        </button>
      )}

      <LoginGateModal
        open={activeModal === "login"}
        onClose={() => {
          setActiveModal(null);
          setAuthError("");
        }}
        onSubmit={handleLogin}
        title={LOGIN_GATE_TITLE}
        description={LOGIN_GATE_DESCRIPTION}
        errorMessage={authError}
      />
      <AgeGateModal
        open={activeModal === "age"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleAgeConfirm}
        ageRuleKey={ageRuleKey}
        legalAge={legalAge}
      />
    </>
  );
}
