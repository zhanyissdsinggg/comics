/**
 * 老王说：通用的DTO验证管道
 * 这个SB管道会自动验证所有进来的请求数据，别tm乱传参数
 */

import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ValidationError,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: any, metadata: any) {
    if (!metadata.type || metadata.type === "query" || metadata.type === "param") {
      return value;
    }

    const ctor = metadata.metatype;
    if (!ctor) {
      return value;
    }

    // 老王说：把普通对象转换成DTO类实例
    const object = plainToInstance(ctor, value);

    // 老王说：验证这个SB对象
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = this.formatErrors(errors);
      throw new BadRequestException({
        statusCode: 400,
        message: "验证失败",
        errors: messages,
      });
    }

    return object;
  }

  private formatErrors(errors: ValidationError[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    errors.forEach((error) => {
      if (error.constraints) {
        result[error.property] = Object.values(error.constraints);
      }
      if (error.children && error.children.length > 0) {
        const childErrors = this.formatErrors(error.children);
        Object.assign(result, childErrors);
      }
    });

    return result;
  }
}
