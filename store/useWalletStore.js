"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { apiGet, apiPost } from "../lib/apiClient";
import { track } from "../lib/analytics";

const WalletContext = createContext(null);

const defaultWallet = {
  paidPts: 0,
  bonusPts: 0,
  plan: "free",
  subscription: null,
};

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(defaultWallet);

  const loadWallet = useCallback(async () => {
    const response = await apiGet("/api/wallet");
    if (response.ok && response.data?.wallet) {
      setWallet(response.data.wallet);
    }
    return response;
  }, []);

  const topup = useCallback(async (packageId) => {
    track("topup_start", { packageId });
    const response = await apiPost("/api/wallet/topup", { packageId });
    if (!response.ok) {
      track("topup_fail", {
        packageId,
        status: response.status,
        errorCode: response.error,
        requestId: response.requestId,
      });
      return response;
    }
    if (response.data?.wallet) {
      setWallet(response.data.wallet);
    }
    track("topup_success", { packageId });
    return response;
  }, []);

  const value = useMemo(
    () => ({ ...wallet, loadWallet, topup, setWallet }),
    [loadWallet, topup, wallet]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletStore() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletStore must be used within WalletProvider");
  }
  return context;
}
