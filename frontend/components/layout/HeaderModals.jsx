"use client";

import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";
import { useWalletStore } from "../../store/useWalletStore";
import { trackEvent } from "../../lib/trackEvent";
import LoginGateModal from "./LoginGateModal";
import AgeGateModal from "./AgeGateModal";
import WalletTopUpPrompt from "../wallet/WalletTopUpPrompt";

/**
 * 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欑鑶╅柟顑跨劍椤㈠鈧湱鎳撳▍鎺旂磼閸曨亝顐?- 闁告瑯浜ｇ粈瀣嫻閿濆浂鍚€闁荤偛妫欐晶宥夊嫉婢跺瑔渚€骞€娴ｈ鏀遍柣銊ュ婵悂骞€娴ｅ憡瀚查梺顐ｆ缁? * 闁煎崬鐭侀惌妤呭础閺囨氨顏遍柨娑欒壘椤︹晠鎮堕崱娆愵仮鐟滅増娲忛埀顑跨閸曠偓螞閸曨垳宕ｉ悹鍥﹂檷閳ь兛绶氶幐鍫曞礌閸涱厼甯犻柛濠呭亹閻℃垵螣閳╁啠鍋撴担璇℃敱闁汇劌瀚Ο澶岀矆?闂傚懏鍔樺Λ宀勫椽鐏炶偐鐨戝ù鐘烘硾椤︹晠鎮? * 閺夆晜鐟ら柌婊呯磼閸曨亝顐介柟璺猴攻婢у秹寮垫径瀣嗕線骞€娴ｈ鏀遍梺顐ｆ缁额偊姊块崱鏇″幀闁革负鍔嬬粩瀵告導閸戙倗绀夐柡鍌炩偓娑氣敀缂備礁鐡ㄦ慨? */
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
          onModalClose("age", true); // 闁瑰灚鎸哥槐鎴︾嵁閹绢喚绐炲Δ鐘茬焷閻﹀螣閳╁啠鍋撴担璇℃敱
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
    // 閻庝絻澹堥崺鍛村礆閻ㄥore濡炪倗鏁诲?
    if (typeof window !== "undefined") {
      window.location.href = "/store";
    }
  };

  return (
    <>
      {/* 闁谎嗩嚙缂嶅秴螣閳╁啠鍋撴担璇℃敱 */}
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

      {/* 妤犵偞鎸崇欢鐐搭殽瀹€鍐婵☆垪鍓濋埀顑跨劍椤?*/}
      <AgeGateModal
        open={activeModal === "age"}
        onClose={() => onModalClose("age")}
        onConfirm={handleAgeConfirm}
        ageRuleKey={ageRuleKey}
        legalAge={legalAge}
      />

      {/* 闂佽棄宕€垫﹢宕楅崨顓涘亾閸忕厧绲圭紒鈧?*/}
      <WalletTopUpPrompt
        isOpen={activeModal === "topup"}
        onClose={() => onModalClose("topup")}
        currentPoints={paidPts + bonusPts}
        onTopUp={handleTopUp}
      />
    </>
  );
}
