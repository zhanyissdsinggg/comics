import { Controller, Get, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getPlanCatalog, PLAN_CATALOG } from "../../common/config/plans";
import { listTopupPackages } from "../../common/config/topup";
import { getPublicBillingAvailability } from "../../common/utils/billing-mode";

@Controller("billing")
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get("topups")
  async listTopups() {
    const billing = getPublicBillingAvailability();
    try {
      const packages = await listTopupPackages(this.prisma);
      return { packages, billing };
    } catch (error) {
      const stack = error instanceof Error ? error.stack || error.message : String(error);
      this.logger.error("Billing topups endpoint degraded.", stack);
      return { packages: await listTopupPackages(null), billing };
    }
  }

  @Get("plans")
  async listPlans() {
    const billing = getPublicBillingAvailability();
    try {
      const catalog = await getPlanCatalog(this.prisma);
      return { plans: Object.values(catalog), billing };
    } catch (error) {
      const stack = error instanceof Error ? error.stack || error.message : String(error);
      this.logger.error("Billing plans endpoint degraded.", stack);
      return { plans: Object.values(PLAN_CATALOG), billing };
    }
  }
}
