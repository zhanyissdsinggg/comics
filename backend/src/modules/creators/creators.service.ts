import { Injectable } from "@nestjs/common";
import { CacheService } from "../../common/cache/cache.service";
import { CreatorCreditsService } from "../../common/creators/creator-credits.service";

function buildCreatorsListCacheKey(adult: boolean): string {
  return `creators:list:${adult ? "adult" : "standard"}:public:v2`;
}

@Injectable()
export class CreatorsService {
  constructor(
    private readonly creatorCreditsService: CreatorCreditsService,
    private readonly cacheService: CacheService,
  ) {}

  async listPublicCreators(adult = false) {
    const cacheKey = buildCreatorsListCacheKey(adult);
    const cached = await this.cacheService.get<Awaited<ReturnType<CreatorCreditsService["listPublicCreators"]>>>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const creators = await this.creatorCreditsService.listPublicCreators(100, adult);
    await this.cacheService.set(cacheKey, creators, 300);
    return creators;
  }

  async getPublicCreator(slug: string, adult = false) {
    const cacheKey = `creators:detail:${adult ? "adult" : "standard"}:${slug}:v2`;
    const cached = await this.cacheService.get<Awaited<ReturnType<CreatorCreditsService["getPublicCreatorBySlug"]>>>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const creator = await this.creatorCreditsService.getPublicCreatorBySlug(slug, adult);
    if (creator) {
      await this.cacheService.set(cacheKey, creator, 300);
    }
    return creator;
  }
}
