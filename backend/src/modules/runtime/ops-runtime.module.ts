import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { EventsModule } from "../events/events.module";
import { MissionsModule } from "../missions/missions.module";
import { RewardsModule } from "../rewards/rewards.module";
import { TrackingModule } from "../tracking/tracking.module";

@Module({
  imports: [
    EmailModule,
    EventsModule,
    MissionsModule,
    RewardsModule,
    TrackingModule,
  ],
})
export class OpsRuntimeModule {}
