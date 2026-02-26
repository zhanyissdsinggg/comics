import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { listTopupPackages } from "../../common/config/topup";
import { getPlanCatalog } from "../../common/config/plans";

@Controller("billing")
export class BillingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("topups")
  async listTopups() {
    const packages = await listTopupPackages(this.prisma);
    return { packages };
  }

  @Get("plans")
  async listPlans() {
    const catalog = await getPlanCatalog(this.prisma);
    return { plans: Object.values(catalog) };
  }
}
