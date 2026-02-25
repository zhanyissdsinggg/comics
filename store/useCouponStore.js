"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { apiGet, apiPost } from "../lib/apiClient";

const CouponContext = createContext(null);

export function CouponProvider({ children }) {
  const [coupons, setCoupons] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const loadCoupons = useCallback(async () => {
    const response = await apiGet("/api/coupons");
    if (response.ok) {
      setCoupons(response.data?.coupons || []);
      setLoaded(true);
    }
    return response;
  }, []);

  const claimCoupon = useCallback(async (code) => {
    const response = await apiPost("/api/coupons", { code });
    if (response.ok) {
      setCoupons(response.data?.coupons || []);
    }
    return response;
  }, []);

  const value = useMemo(
    () => ({ coupons, loaded, loadCoupons, claimCoupon }),
    [coupons, loaded, loadCoupons, claimCoupon]
  );

  return <CouponContext.Provider value={value}>{children}</CouponContext.Provider>;
}

export function useCouponStore() {
  const context = useContext(CouponContext);
  if (!context) {
    throw new Error("useCouponStore must be used within CouponProvider");
  }
  return context;
}
