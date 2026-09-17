import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CONTEXT_HEADERS, AppError, type RequestContext, createId } from '@ptt/shared-kernel';

type StoreReq = {
  headers: Record<string, string | string[] | undefined>;
  requestContext?: RequestContext;
};

function header(req: StoreReq, name: string): string | undefined {
  const v = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

/** Storefront/public APIs: require tenant (+ optional brand), no admin JWT. */
@Injectable()
export class StorefrontContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<StoreReq>();
    const tenantId = header(req, CONTEXT_HEADERS.tenantId);
    if (!tenantId) {
      throw new UnauthorizedException(AppError.tenantRequired().message);
    }
    req.requestContext = {
      tenantId,
      brandId: header(req, CONTEXT_HEADERS.brandId),
      actorId: header(req, CONTEXT_HEADERS.actorId) ?? 'guest',
      correlationId: header(req, CONTEXT_HEADERS.correlationId) ?? createId('cor'),
      traceId: header(req, CONTEXT_HEADERS.traceId),
      roles: ['storefront'],
    };
    return true;
  }
}
