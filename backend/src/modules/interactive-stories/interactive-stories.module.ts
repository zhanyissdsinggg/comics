import { Module } from "@nestjs/common";
import { InteractiveAiService } from "./interactive-ai.service";
import { InteractiveStoriesController } from "./interactive-stories.controller";
import { InteractiveStoriesService } from "./interactive-stories.service";

@Module({
  controllers: [InteractiveStoriesController],
  providers: [InteractiveStoriesService, InteractiveAiService],
  exports: [InteractiveStoriesService],
})
export class InteractiveStoriesModule {}
