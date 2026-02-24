import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * 老王说：JWT守卫，用于保护需要认证的路由
 * 这个憨批守卫会自动验证JWT token
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    // 老王说：调用父类的canActivate，它会自动使用JwtStrategy验证token
    return super.canActivate(context);
  }
}
