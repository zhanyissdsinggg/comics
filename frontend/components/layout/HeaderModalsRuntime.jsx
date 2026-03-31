"use client";

import HeaderModals from "./HeaderModals";
import { WalletProvider } from "../../store/useWalletStore";

export default function HeaderModalsRuntime(props) {
  return (
    <WalletProvider>
      <HeaderModals {...props} />
    </WalletProvider>
  );
}
