import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { CouponsModule } from "../coupons/coupons.module";
import { EntitlementsModule } from "../entitlements/entitlements.module";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsModule } from "../payments/payments.module";
import { PromotionsModule } from "../promotions/promotions.module";
import { SubscriptionModule } from "../subscription/subscription.module";
import { WalletModule } from "../wallet/wallet.module";

@Module({
  imports: [
    BillingModule,
    CouponsModule,
    EntitlementsModule,
    OrdersModule,
    PaymentsModule,
    PromotionsModule,
    SubscriptionModule,
    WalletModule,
  ],
})
export class CommercialRuntimeModule {}
