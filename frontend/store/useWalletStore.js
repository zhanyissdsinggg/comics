"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiDelete, apiGet, apiPost } from "../lib/apiClient";
import {
  clearPersistedPaymentAttribution,
  loadPersistedPaymentAttribution,
  mergePaymentAttribution,
  persistPaymentAttribution,
} from "../lib/paymentAttribution";
import { siteConfig } from "../lib/siteConfig";
import { getTopupPackage } from "../lib/topupCatalog";
import { trackEvent } from "../lib/trackEvent";
import { useAuthStore } from "./useAuthStore";

const WalletContext = createContext(null);
const WALLET_SYNC_EVENT = "mn-wallet-sync";

const defaultWallet = {
  paidPts: 0,
  bonusPts: 0,
  plan: "free",
  subscription: null,
  subscriptionUsage: null,
  subscriptionVoucher: null,
};

function normalizePackageId(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/^points_pack_/, "").trim();
}

function createIdempotencyKey(prefix) {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${suffix}`;
}

function resolvePaymentOptions(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      attribution: mergePaymentAttribution(
        loadPersistedPaymentAttribution(),
        input || null,
      ),
      expectedAmount: undefined,
      provider: undefined,
      createIdempotencyKey: undefined,
      confirmIdempotencyKey: undefined,
    };
  }

  const hasOptionKeys = [
    "attribution",
    "expectedAmount",
    "provider",
    "createIdempotencyKey",
    "confirmIdempotencyKey",
  ].some((key) => Object.prototype.hasOwnProperty.call(input, key));

  const options = hasOptionKeys ? input : { attribution: input };
  const expectedAmount = Number(options.expectedAmount);

  return {
    attribution: mergePaymentAttribution(
      loadPersistedPaymentAttribution(),
      options.attribution,
    ),
    expectedAmount:
      Number.isFinite(expectedAmount) && expectedAmount > 0
        ? expectedAmount
        : undefined,
    provider:
      typeof options.provider === "string"
        ? options.provider.trim()
        : undefined,
    createIdempotencyKey:
      typeof options.createIdempotencyKey === "string" &&
      options.createIdempotencyKey.trim()
        ? options.createIdempotencyKey.trim()
        : undefined,
    confirmIdempotencyKey:
      typeof options.confirmIdempotencyKey === "string" &&
      options.confirmIdempotencyKey.trim()
        ? options.confirmIdempotencyKey.trim()
        : undefined,
  };
}

function openAuthModal() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("auth:open"));
}

export function WalletProvider({ children }) {
  const { isSignedIn } = useAuthStore();
  const [wallet, setWalletState] = useState(defaultWallet);
  const inflightRef = useRef(new Map());
  const providerIdRef = useRef(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `wallet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
  );

  const setWallet = useCallback((nextWallet) => {
    setWalletState((currentWallet) => {
      const resolvedWallet =
        typeof nextWallet === "function"
          ? nextWallet(currentWallet)
          : nextWallet;

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(WALLET_SYNC_EVENT, {
            detail: {
              sourceId: providerIdRef.current,
              wallet: resolvedWallet,
            },
          }),
        );
      }

      return resolvedWallet;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleSync = (event) => {
      const sourceId = event?.detail?.sourceId;
      if (!sourceId || sourceId === providerIdRef.current) {
        return;
      }

      const nextWallet = event?.detail?.wallet;
      if (!nextWallet || typeof nextWallet !== "object") {
        return;
      }

      setWalletState(nextWallet);
    };

    window.addEventListener(WALLET_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(WALLET_SYNC_EVENT, handleSync);
  }, []);

  const loadWallet = useCallback(async () => {
    if (!isSignedIn) {
      return { ok: false, status: 401, error: "UNAUTHENTICATED" };
    }
    const response = await apiGet("/api/wallet");
    if (response.ok && response.data?.wallet) {
      setWallet(response.data.wallet);
    }
    return response;
  }, [isSignedIn, setWallet]);

  const subscribe = useCallback(
    async (planId, options = null) => {
      const { attribution } = resolvePaymentOptions(options);
      if (attribution) {
        persistPaymentAttribution(attribution);
      }

      if (
        siteConfig.monetization.checkoutEnabled !== true ||
        siteConfig.monetization.membershipEnabled !== true
      ) {
        return { ok: false, status: 503, error: "SUBSCRIPTION_DISABLED" };
      }

      if (!isSignedIn) {
        openAuthModal();
        return { ok: false, status: 401, error: "UNAUTHENTICATED" };
      }

      trackEvent("subscribe_start", {
        planId,
        entryPoint: attribution?.entryPoint,
        promotionId: attribution?.promotionId,
        offerId: attribution?.offerId,
      });

      const response = await apiPost("/api/subscription", {
        planId,
        attribution,
      });
      if (response.ok && response.data?.subscription) {
        setWallet((prev) => ({
          ...prev,
          subscription: response.data.subscription,
          plan: planId,
        }));
        loadWallet();
        clearPersistedPaymentAttribution();
        trackEvent("subscribe_success", {
          planId,
          entryPoint: attribution?.entryPoint,
          promotionId: attribution?.promotionId,
          offerId: attribution?.offerId,
        });
        return response;
      }

      trackEvent("subscribe_fail", {
        planId,
        status: response.status,
        errorCode: response.error,
        entryPoint: attribution?.entryPoint,
        promotionId: attribution?.promotionId,
        offerId: attribution?.offerId,
      });
      return response;
    },
    [isSignedIn, loadWallet, setWallet],
  );

  const cancelSubscription = useCallback(async () => {
    const response = await apiDelete("/api/subscription");
    if (response.ok) {
      setWallet((prev) => ({
        ...prev,
        subscription: response.data?.subscription || null,
        plan: "free",
      }));
      trackEvent("subscribe_cancel", {});
    }
    return response;
  }, [setWallet]);

  const topup = useCallback(
    async (packageId, options = null) => {
      const normalizedPackageId = normalizePackageId(packageId);
      const requestOptions = resolvePaymentOptions(options);
      const attribution = mergePaymentAttribution(requestOptions.attribution, {
        offerId:
          requestOptions.attribution?.offerId ||
          `points_pack_${normalizedPackageId}`,
      });

      if (attribution) {
        persistPaymentAttribution(attribution);
      }

      if (
        siteConfig.monetization.checkoutEnabled !== true ||
        siteConfig.monetization.pointPacksEnabled !== true
      ) {
        return { ok: false, status: 503, error: "CHECKOUT_DISABLED" };
      }

      if (!isSignedIn) {
        openAuthModal();
        return { ok: false, status: 401, error: "UNAUTHENTICATED" };
      }

      const key = `topup:${normalizedPackageId}`;
      if (inflightRef.current.has(key)) {
        return inflightRef.current.get(key);
      }

      const requestPromise = (async () => {
        const pkg = await getTopupPackage(normalizedPackageId).catch(
          () => null,
        );
        const catalogAmount = Number(pkg?.price);
        const expectedAmount =
          requestOptions.expectedAmount ??
          (Number.isFinite(catalogAmount) ? catalogAmount : undefined);

        if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
          trackEvent("topup_fail", {
            packageId: normalizedPackageId,
            errorCode: "INVALID_PACKAGE",
            entryPoint: attribution?.entryPoint,
            promotionId: attribution?.promotionId,
            offerId: attribution?.offerId,
          });
          return { ok: false, status: 400, error: "INVALID_PACKAGE" };
        }

        const provider = requestOptions.provider || "stripe";
        const createRequestKey =
          requestOptions.createIdempotencyKey ||
          createIdempotencyKey(`topup_create_${normalizedPackageId}`);
        const confirmRequestKey =
          requestOptions.confirmIdempotencyKey ||
          createIdempotencyKey(`topup_confirm_${normalizedPackageId}`);

        trackEvent("topup_start", {
          packageId: normalizedPackageId,
          entryPoint: attribution?.entryPoint,
          promotionId: attribution?.promotionId,
          offerId: attribution?.offerId,
        });

        const created = await apiPost("/api/payments/create", {
          packageId: normalizedPackageId,
          provider,
          expectedAmount,
          attribution,
          idempotencyKey: createRequestKey,
        });
        if (!created.ok) {
          trackEvent("topup_fail", {
            packageId: normalizedPackageId,
            status: created.status,
            errorCode: created.error,
            requestId: created.requestId,
            entryPoint: attribution?.entryPoint,
            promotionId: attribution?.promotionId,
            offerId: attribution?.offerId,
          });
          return created;
        }

        const confirm = await apiPost("/api/payments/confirm", {
          paymentId: created.data?.payment?.paymentId,
          idempotencyKey: confirmRequestKey,
        });
        if (!confirm.ok) {
          trackEvent("topup_fail", {
            packageId: normalizedPackageId,
            status: confirm.status,
            errorCode: confirm.error,
            requestId: confirm.requestId,
            entryPoint: attribution?.entryPoint,
            promotionId: attribution?.promotionId,
            offerId: attribution?.offerId,
          });
          return confirm;
        }

        if (confirm.data?.wallet) {
          setWallet(confirm.data.wallet);
        }
        if (typeof window !== "undefined") {
          window.localStorage.setItem("mn_has_purchased", "1");
        }

        clearPersistedPaymentAttribution();
        trackEvent("topup_success", {
          packageId: normalizedPackageId,
          orderId: confirm.data?.order?.orderId,
          entryPoint: attribution?.entryPoint,
          promotionId: attribution?.promotionId,
          offerId: attribution?.offerId,
        });
        return confirm;
      })();

      inflightRef.current.set(key, requestPromise);
      try {
        return await requestPromise;
      } finally {
        inflightRef.current.delete(key);
      }
    },
    [isSignedIn, setWallet],
  );

  const value = useMemo(
    () => ({
      ...wallet,
      loadWallet,
      topup,
      subscribe,
      cancelSubscription,
      setWallet,
    }),
    [cancelSubscription, loadWallet, setWallet, subscribe, topup, wallet],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWalletStore() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletStore must be used within WalletProvider");
  }
  return context;
}
