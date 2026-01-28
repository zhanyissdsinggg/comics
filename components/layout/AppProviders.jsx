"use client";

import { AuthProvider } from "../../store/useAuthStore";
import { WalletProvider } from "../../store/useWalletStore";
import { AdultGateProvider } from "../../store/useAdultGateStore";
import { HomeProvider } from "../../store/useHomeStore";

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <WalletProvider>
        <AdultGateProvider>
          <HomeProvider>{children}</HomeProvider>
        </AdultGateProvider>
      </WalletProvider>
    </AuthProvider>
  );
}
