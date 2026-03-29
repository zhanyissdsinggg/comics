import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CommentsModule } from "../comments/comments.module";
import { FollowModule } from "../follow/follow.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PreferencesModule } from "../preferences/preferences.module";
import { ProgressModule } from "../progress/progress.module";
import { RatingsModule } from "../ratings/ratings.module";
import { ReadingModule } from "../reading/reading.module";
import { SupportModule } from "../support/support.module";

@Module({
  imports: [
    AuthModule,
    CommentsModule,
    FollowModule,
    NotificationsModule,
    PreferencesModule,
    ProgressModule,
    RatingsModule,
    ReadingModule,
    SupportModule,
  ],
})
export class UserRuntimeModule {}
