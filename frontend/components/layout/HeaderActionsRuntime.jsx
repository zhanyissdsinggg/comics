"use client";

import HeaderActions from "./HeaderActions";
import { WalletProvider } from "../../store/useWalletStore";

export default function HeaderActionsRuntime(props) {
  return (
    <WalletProvider>
      <HeaderActions {...props} />
    </WalletProvider>
  );
}
