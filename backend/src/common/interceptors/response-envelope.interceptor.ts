import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest();
    const requestId = req?.requestId;
    return next.handle().pipe(
      map((data) => {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          return data;
        }
        if (requestId && !data.requestId) {
          return { ...data, requestId };
        }
        return data;
      })
    );
  }
}
