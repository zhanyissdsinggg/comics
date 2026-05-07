"use client";

import { useState } from "react";
import EmptyState from "./EmptyState";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useAuthStore } from "../../store/useAuthStore";
import { canViewMatureContent } from "../../lib/matureContent";
import AgeGateModal from "../layout/AgeGateModal";

export default function MatureCatalogState({
  mode = "gate",
  className = "",
  browseHref = "/search",
}) {
  const { hydrated, isSignedIn } = useAuthStore();
  const {
    adultConfirmed,
    ageRuleKey,
    legalAge,
    isAdultMode,
    enableAdultMode,
    confirmAge,
  } = useAdultGateStore();
  const [activeModal, setActiveModal] = useState(null);
  const canAccessMature = canViewMatureContent({ adultConfirmed, isAdultMode });
  const isEmptyMode = mode === "empty";

  const openGate = () => {
    if (!hydrated || !isSignedIn) {
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
          href:
            isEmptyMode || !hydrated || !isSignedIn
              ? isEmptyMode
                ? browseHref
                : "/account"
              : "",
          onClick:
            isEmptyMode || !hydrated || !isSignedIn
              ? null
              : () => {
                  openGate();
                },
        }}
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
