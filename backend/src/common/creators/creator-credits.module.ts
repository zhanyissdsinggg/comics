import { Global, Module } from "@nestjs/common";
import { CreatorCreditsService } from "./creator-credits.service";

@Global()
@Module({
  providers: [CreatorCreditsService],
  exports: [CreatorCreditsService],
})
export class CreatorCreditsModule {}
