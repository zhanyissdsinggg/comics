import { Module } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AdminAuthModule } from "../admin-auth/admin-auth.module";
import { AdminRecommendationService } from "./services/admin-recommendation.service";
import { AdminSeriesController } from "../controllers/admin-series.controller";
import { AdminEpisodesController } from "../controllers/admin-episodes.controller";
import { AdminEpisodesUploadController } from "../controllers/admin-episodes-upload.controller";
import { AdminRecommendationController } from "../controllers/admin-recommendation.controller";
import { AdminCreatorsController } from "../controllers/admin-creators.controller";
import { AdminCommentsController } from "./controllers/admin-comments.controller";
import { AdminPromotionsController } from "./controllers/admin-promotions.controller";
import { AdminContentGeneratorController } from "./controllers/admin-content-generator.controller";
import { AdminCreatorsService } from "./services/admin-creators.service";
import { AdminInteractiveStoriesController } from "../controllers/admin-interactive-stories.controller";
import { AdminInteractivePanelsController } from "../controllers/admin-interactive-panels.controller";
import { InteractiveAiService } from "../../interactive-stories/interactive-ai.service";

@Module({
  imports: [AdminAuthModule],
  controllers: [
    AdminSeriesController,
    AdminCreatorsController,
    AdminEpisodesController,
    AdminEpisodesUploadController,
    AdminRecommendationController,
    AdminCommentsController,
    AdminPromotionsController,
    AdminContentGeneratorController,
    AdminInteractiveStoriesController,
    AdminInteractivePanelsController,
  ],
  providers: [
    AdminRecommendationService,
    AdminCreatorsService,
    PrismaService,
    InteractiveAiService,
  ],
  exports: [AdminRecommendationService, AdminCreatorsService],
})
export class AdminContentModule {}
