import { Controller, Get, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getPlanCatalog, PLAN_CATALOG } from "../../common/config/plans";
import { listTopupPackages } from "../../common/config/topup";

@Controller("billing")
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get("topups")
  async listTopups() {
    try {
      const packages = await listTopupPackages(this.prisma);
      return { packages };
    } catch (error) {
      const stack = error instanceof Error ? error.stack || error.message : String(error);
      this.logger.error("Billing topups endpoint degraded.", stack);
      return { packages: await listTopupPackages(null) };
    }
  }

  @Get("plans")
  async listPlans() {
    try {
      const catalog = await getPlanCatalog(this.prisma);
      return { plans: Object.values(catalog) };
    } catch (error) {
      const stack = error instanceof Error ? error.stack || error.message : String(error);
      this.logger.error("Billing plans endpoint degraded.", stack);
      return { plans: Object.values(PLAN_CATALOG) };
    }
  }
}
