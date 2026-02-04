"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../lib/apiClient";
import { track } from "../lib/analytics";
import { useAuthStore } from "./useAuthStore";

const WalletContext = createContext(null);

const defaultWallet = {
  paidPts: 0,
  bonusPts: 0,
  plan: "free",
  subscription: null,
  subscriptionUsage: null,
  subscriptionVoucher: null,
};

export function WalletProvider({ children }) {
  const { isSignedIn } = useAuthStore();
  const [wallet, setWallet] = useState(defaultWallet);
  const inflightRef = useRef(new Map());

  const loadWallet = useCallback(async () => {
    if (!isSignedIn) {
      return { ok: false, status: 401, error: "UNAUTHENTICATED" };
    }
    const response = await apiGet("/api/wallet");
    if (response.ok && response.data?.wallet) {
      setWallet(response.data.wallet);
    }
    return response;
  }, [isSignedIn]);

  const subscribe = useCallback(async (planId) => {
    track("subscribe_start", { planId });
    const response = await apiPost("/api/subscription", { planId });
    if (response.ok && response.data?.subscription) {
      setWallet((prev) => ({ ...prev, subscription: response.data.subscription, plan: planId }));
      loadWallet();
      track("subscribe_success", { planId });
      return response;
    }
    track("subscribe_fail", { planId, status: response.status, errorCode: response.error });
    return response;
  }, [loadWallet]);

  const cancelSubscription = useCallback(async () => {
    const response = await apiDelete("/api/subscription");
    if (response.ok) {
      setWallet((prev) => ({ ...prev, subscription: response.data?.subscription || null, plan: "free" }));
      track("subscribe_cancel", {});
    }
    return response;
  }, []);

  const topup = useCallback(async (packageId) => {
    if (!isSignedIn) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:open"));
      }
      return { ok: false, status: 401, error: "UNAUTHENTICATED" };
    }
    const key = `topup:${packageId}`;
    if (inflightRef.current.has(key)) {
      return inflightRef.current.get(key);
    }
    track("topup_start", { packageId });
    const requestPromise = (async () => {
      const created = await apiPost("/api/payments/create", { packageId, provider: "stripe" });
      if (!created.ok) {
        track("topup_fail", {
          packageId,
          status: created.status,
          errorCode: created.error,
          requestId: created.requestId,
        });
        return created;
      }
      const confirm = await apiPost("/api/payments/confirm", {
        paymentId: created.data?.payment?.paymentId,
      });
      if (!confirm.ok) {
        track("topup_fail", {
          packageId,
          status: confirm.status,
          errorCode: confirm.error,
          requestId: confirm.requestId,
        });
        return confirm;
      }
      if (confirm.data?.wallet) {
        setWallet(confirm.data.wallet);
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem("mn_has_purchased", "1");
      }
      track("topup_success", { packageId });
      return confirm;
    })();
    inflightRef.current.set(key, requestPromise);
    try {
      return await requestPromise;
    } finally {
      inflightRef.current.delete(key);
    }
  }, [isSignedIn]);

  const value = useMemo(
    () => ({ ...wallet, loadWallet, topup, subscribe, cancelSubscription, setWallet }),
    [loadWallet, topup, subscribe, cancelSubscription, wallet]
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
