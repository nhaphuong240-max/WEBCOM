import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestContext } from '@ptt/shared-kernel';

export const ReqContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const req = ctx.switchToHttp().getRequest<{ requestContext: RequestContext }>();
    return req.requestContext;
  },
);
