"use client";

import { CouponProvider } from "../../store/useCouponStore";
import { WalletProvider } from "../../store/useWalletStore";
import FigmaStorePage from "../figma/FigmaStorePage";

export default function StorePage(props) {
  return (
    <WalletProvider>
      <CouponProvider>
        <FigmaStorePage {...props} />
      </CouponProvider>
    </WalletProvider>
  );
}
