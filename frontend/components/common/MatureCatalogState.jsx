"use client";

import { useState } from "react";
import EmptyState from "./EmptyState";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import { canViewMatureContent } from "../../lib/matureContent";
import AgeGateModal from "../layout/AgeGateModal";
import LoginGateModal from "../layout/LoginGateModal";
import {
  LOGIN_GATE_DESCRIPTION,
  LOGIN_GATE_TITLE,
} from "../../lib/adultGateCopy";

export default function MatureCatalogState({
  mode = "gate",
  className = "",
  browseHref = "/search",
}) {
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

  const canAccessMature = canViewMatureContent({ adultConfirmed, isAdultMode });
  const isEmptyMode = mode === "empty";

  const openGate = () => {
    if (!hydrated || !isSignedIn) {
      setActiveModal("login");
      return;
    }

    if (!canAccessMature) {
      setActiveModal("age");
      return;
    }

    if (!isAdultMode) {
      enableAdultMode();
    }
  };

  const handleLogin = async ({ email, password, mode: authMode }) => {
    const response = await signIn(email, password, authMode);
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
    return response;
  };

  const handleAgeConfirm = () => {
    confirmAge(ageRuleKey);
    if (!isAdultMode) {
      enableAdultMode();
    }
    setActiveModal(null);
  };

  return (
    <>
      <EmptyState
        icon={isEmptyMode ? "book" : "alert"}
        eyebrow="Mature"
        title={
          isEmptyMode
            ? "No mature titles are available yet."
            : "Confirm legal age to view mature titles."
        }
        description={
          isEmptyMode
            ? "This category is unlocked, but there are no mature titles in the catalog right now."
            : "Mature titles stay hidden until you sign in and confirm that you meet the legal age requirement for your region."
        }
        appearance="dark"
        className={className}
        action={{
          label: isEmptyMode
            ? "Browse all titles"
            : hydrated && isSignedIn
              ? "Confirm legal age"
              : "Sign in to continue",
          onClick: () => {
            if (isEmptyMode) {
              if (typeof window !== "undefined") {
                window.location.assign(browseHref);
              }
              return;
            }

            openGate();
          },
        }}
      />

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
