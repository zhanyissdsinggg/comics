"use client";

import FigmaStorePage from "../../components/figma/FigmaStorePage";
import { CouponProvider } from "../../store/useCouponStore";
import { WalletProvider } from "../../store/useWalletStore";

export default function StorePageRuntime(props) {
  return (
    <WalletProvider>
      <CouponProvider>
        <FigmaStorePage {...props} />
      </CouponProvider>
    </WalletProvider>
  );
}
