import { Controller, Get } from "@nestjs/common";
import { getBrandingConfig } from "../../common/storage/mock-store";

@Controller("branding")
export class BrandingController {
  @Get()
  getBranding() {
    return { branding: getBrandingConfig() };
  }
}
