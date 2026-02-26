import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsOrdersController } from "./controllers/payments-orders.controller";
import { PaymentsWebhookController } from "./controllers/payments-webhook.controller";

@Module({
  controllers: [PaymentsOrdersController, PaymentsWebhookController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
