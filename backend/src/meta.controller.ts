import { Controller, Get } from "@nestjs/common";

@Controller("meta")
export class MetaController {
  @Get("version")
  version() {
    return {
      name: "tappytoon-backend",
      version: "0.1.0",
      time: new Date().toISOString(),
    };
  }
}
