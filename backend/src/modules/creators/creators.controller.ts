import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { CreatorsService } from "./creators.service";

@Controller("creators")
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get()
  async list() {
    const creators = await this.creatorsService.listPublicCreators();
    return {
      creators,
      count: creators.length,
    };
  }

  @Get(":slug")
  async detail(@Param("slug") slug: string) {
    const creator = await this.creatorsService.getPublicCreator(slug);
    if (!creator) {
      throw new NotFoundException("Creator not found.");
    }

    return {
      creator,
    };
  }
}
