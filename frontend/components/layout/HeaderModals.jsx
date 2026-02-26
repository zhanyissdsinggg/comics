"use client";

import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useWalletStore } from "../../store/useWalletStore";
import { track } from "../../lib/analytics";
import LoginGateModal from "./LoginGateModal";
import AgeGateModal from "./AgeGateModal";
import WalletTopUpPrompt from "../wallet/WalletTopUpPrompt";

/**
 * 老王注释：模态框容器组件 - 只负责管理所有模态框的状态和逻辑
 * 职责单一：处理登录、年龄验证、钱包充值等模态框的显示/隐藏和事件处理
 * 这个组件把所有模态框逻辑集中在一起，方便维护
 */
export default function HeaderModals({
  activeModal,
  onModalClose,
  authError,
  onAuthError,
  pendingAdultToggle,
  onPendingAdultToggleChange,
}) {
  const { signIn, signOut } = useAuthStore();
  const {
    requestAdultToggle,
    confirmAge,
    ageRuleKey,
    legalAge,
    forceDisableAdultMode,
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
          onModalClose("login");
          onModalClose("age", true); // 打开年龄验证模态框
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
          // 这里应该调用router.push，但由于这是一个纯逻辑组件，
          // 我们通过事件或回调来处理导航
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
    track("adult_gate_confirm", { source: "header", ruleKey });
    confirmAge(ruleKey);
    onModalClose("age");
    track("adult_gate_enabled", { source: "header" });
  };

  const handleTopUp = (pkg) => {
    track("wallet_topup_selected", { package: pkg.id, points: pkg.points, price: pkg.price });
    // 导航到store页面
    if (typeof window !== "undefined") {
      window.location.href = "/store";
    }
  };

  return (
    <>
      {/* 登录模态框 */}
      <LoginGateModal
        open={activeModal === "login"}
        onClose={() => {
          onModalClose("login");
          onPendingAdultToggleChange(false);
          onAuthError("");
        }}
        allowRegister
        title="Sign in"
        description="Enter your email and password."
        errorMessage={authError}
        onSubmit={handleLogin}
      />

      {/* 年龄验证模态框 */}
      <AgeGateModal
        open={activeModal === "age"}
        onClose={() => onModalClose("age")}
        onConfirm={handleAgeConfirm}
        ageRuleKey={ageRuleKey}
        legalAge={legalAge}
      />

      {/* 钱包充值提示 */}
      <WalletTopUpPrompt
        isOpen={activeModal === "topup"}
        onClose={() => onModalClose("topup")}
        currentPoints={paidPts + bonusPts}
        onTopUp={handleTopUp}
      />
    </>
  );
}
