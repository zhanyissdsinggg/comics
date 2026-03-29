import { Injectable } from "@nestjs/common";
import { CacheService } from "../../common/cache/cache.service";
import { CreatorCreditsService } from "../../common/creators/creator-credits.service";

const CREATORS_LIST_CACHE_KEY = "creators:list:public";

@Injectable()
export class CreatorsService {
  constructor(
    private readonly creatorCreditsService: CreatorCreditsService,
    private readonly cacheService: CacheService,
  ) {}

  async listPublicCreators() {
    const cached = await this.cacheService.get<Awaited<ReturnType<CreatorCreditsService["listPublicCreators"]>>>(
      CREATORS_LIST_CACHE_KEY,
    );
    if (cached) {
      return cached;
    }

    const creators = await this.creatorCreditsService.listPublicCreators();
    await this.cacheService.set(CREATORS_LIST_CACHE_KEY, creators, 300);
    return creators;
  }

  async getPublicCreator(slug: string) {
    const cacheKey = `creators:detail:${slug}`;
    const cached = await this.cacheService.get<Awaited<ReturnType<CreatorCreditsService["getPublicCreatorBySlug"]>>>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const creator = await this.creatorCreditsService.getPublicCreatorBySlug(slug);
    if (creator) {
      await this.cacheService.set(cacheKey, creator, 300);
    }
    return creator;
  }
}
