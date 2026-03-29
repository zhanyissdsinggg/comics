import { Module } from "@nestjs/common";
import { BrandingModule } from "../branding/branding.module";
import { CreatorsModule } from "../creators/creators.module";
import { EpisodeModule } from "../episode/episode.module";
import { RankingsModule } from "../rankings/rankings.module";
import { RecommendationModule } from "../recommendation/recommendation.module";
import { RegionsModule } from "../regions/regions.module";
import { SearchModule } from "../search/search.module";
import { SeriesModule } from "../series/series.module";

@Module({
  imports: [
    BrandingModule,
    CreatorsModule,
    EpisodeModule,
    RankingsModule,
    RecommendationModule,
    RegionsModule,
    SearchModule,
    SeriesModule,
  ],
})
export class CorePublicRuntimeModule {}
