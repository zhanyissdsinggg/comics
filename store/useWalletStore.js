"use client";

import { createContext, useContext, useMemo, useState } from "react";

const WalletContext = createContext(null);

const mockWallet = {
  paidPts: 1240,
  bonusPts: 180,
  plan: "premium",
};

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(mockWallet);
  const value = useMemo(() => ({ ...wallet, setWallet }), [wallet]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletStore() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletStore must be used within WalletProvider");
  }
  return context;
}
