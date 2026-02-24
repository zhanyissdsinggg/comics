import { Module } from "@nestjs/common";
import { CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";
import { CommentMapper } from "../../common/mappers/comment.mapper";

@Module({
  controllers: [CommentsController],
  providers: [CommentsService, CommentMapper],
})
export class CommentsModule {}
