import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * 老王注释：全局异常过滤器 - 统一处理所有异常
 * 这个SB过滤器确保所有错误都返回统一的格式，方便前端处理
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '内部服务器错误';
    let error = 'INTERNAL_SERVER_ERROR';

    // 老王说：处理HTTP异常
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const { message: msg, error: err } = exceptionResponse as any;
        message = msg || exception.message;
        error = err || exception.name;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      // 老王说：处理普通错误
      message = exception.message;
      error = exception.name;

      // 老王说：特殊错误类型处理
      if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        error = 'VALIDATION_ERROR';
      } else if (exception.name === 'UnauthorizedError') {
        status = HttpStatus.UNAUTHORIZED;
        error = 'UNAUTHORIZED';
      } else if (exception.name === 'ForbiddenError') {
        status = HttpStatus.FORBIDDEN;
        error = 'FORBIDDEN';
      }
    }

    // 老王说：记录错误日志
    this.logger.error(
      `[${request.method}] ${request.url} - ${status} ${error}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // 老王说：返回统一的错误格式
    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
