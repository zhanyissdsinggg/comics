"use client";

import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useWalletStore } from "../../store/useWalletStore";
import { trackEvent } from "../../lib/trackEvent";
import LoginGateModal from "./LoginGateModal";
import AgeGateModal from "./AgeGateModal";
import WalletTopUpPrompt from "../wallet/WalletTopUpPrompt";
import { LOGIN_GATE_DESCRIPTION } from "../../lib/adultGateCopy";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";

/**
 * NOTE: cleaned corrupted comment. */
export default function HeaderModals({
  activeModal,
  onModalClose,
  authError,
  onAuthError,
  pendingAdultToggle,
  onPendingAdultToggleChange,
}) {
  const { signIn } = useAuthStore();
  const {
    requestAdultToggle,
    confirmAge,
    ageRuleKey,
    legalAge,
  } = useAdultGateStore();
  const { paidPts, bonusPts } = useWalletStore();

  const handleLogin = async ({ email, password, mode }) => {
    const response = await signIn(email, password, mode);
    if (response?.status === 202) {
      onAuthError("");
      return response;
    }
    if (response.ok) {
      if (pendingAdultToggle) {
        const status = requestAdultToggle(true);
        if (status === "NEED_AGE_CONFIRM") {
          onPendingAdultToggleChange(false);
          onModalClose("age", true);
          return;
        }
      }
      onModalClose("login");
      onPendingAdultToggleChange(false);
      onAuthError("");
      if (typeof window !== "undefined") {
        const returnTo = window.sessionStorage.getItem("mn_return_to");
        if (returnTo) {
          window.sessionStorage.removeItem("mn_return_to");
          window.location.href = returnTo;
        }
      }
      return;
    }
    onAuthError(
      mode === "register"
        ? "Registration failed. Try a different email."
        : "Invalid email or password."
    );
    return response;
  };

  const handleAgeConfirm = (ruleKey) => {
    trackEvent("adult_gate_confirm", { source: "header", ruleKey });
    confirmAge(ruleKey);
    onModalClose("age");
    trackEvent("adult_gate_enabled", { source: "header" });
  };

  const handleTopUp = (pkg) => {
    trackEvent("wallet_topup_selected", { package: pkg.id, points: pkg.points, price: pkg.price });
    if (typeof window !== "undefined") {
      const currentPath = `${window.location.pathname}${window.location.search || ""}`;
      const target = buildPathWithAttribution(
        "/store",
        {
          entryPoint: "HEADER_TOPUP",
          offerId: pkg?.id ? `points_pack_${pkg.id}` : undefined,
          sourcePath: currentPath,
          returnTo: currentPath,
        },
        { focus: pkg?.id || "auto" }
      );
      window.location.href = target;
    }
  };

  return (
    <>
      {/* 閻ц缍嶅Ο鈩冣偓浣诡攱 */}
      <LoginGateModal
        open={activeModal === "login"}
        onClose={() => {
          onModalClose("login");
          onPendingAdultToggleChange(false);
          onAuthError("");
        }}
        allowRegister
        title="Sign in"
        description={
          pendingAdultToggle
            ? LOGIN_GATE_DESCRIPTION
            : "Enter your email and password."
        }
        errorMessage={authError}
        onSubmit={handleLogin}
      />

      {/* 楠炴挳绶炴宀冪槈濡剝鈧焦�?*/}
      <AgeGateModal
        open={activeModal === "age"}
        onClose={() => onModalClose("age")}
        onConfirm={handleAgeConfirm}
        ageRuleKey={ageRuleKey}
        legalAge={legalAge}
      />

      {/* 闁藉崬瀵橀崗鍛偓鍏煎絹缁�?*/}
      <WalletTopUpPrompt
        isOpen={activeModal === "topup"}
        onClose={() => onModalClose("topup")}
        currentPoints={paidPts + bonusPts}
        onTopUp={handleTopUp}
      />
    </>
  );
}


