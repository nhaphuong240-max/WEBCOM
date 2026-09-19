import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CONTEXT_HEADERS, AppError, type RequestContext, createId } from '@ptt/shared-kernel';
import { jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service';

type AuthedRequest = {
  headers: Record<string, string | string[] | undefined>;
  requestContext?: RequestContext;
};

function header(req: AuthedRequest, name: string): string | undefined {
  const v = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

@Injectable()
export class TenantAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const correlationId =
      header(req, CONTEXT_HEADERS.correlationId) ?? createId('cor');
    const traceId = header(req, CONTEXT_HEADERS.traceId);

    const bypass = process.env.AUTH_DEV_BYPASS === 'true';
    const auth = header(req, 'authorization');

    let tenantId = header(req, CONTEXT_HEADERS.tenantId);
    let actorId = header(req, CONTEXT_HEADERS.actorId) ?? 'anonymous';
    let brandId = header(req, CONTEXT_HEADERS.brandId);
    let roles: string[] = ['viewer'];
    let sessionId: string | undefined;

    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice('Bearer '.length);
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET ?? 'ptt-w0-dev-secret-change-me',
      );
      try {
        const { payload } = await jwtVerify(token, secret, {
          issuer: process.env.JWT_ISSUER ?? 'ptt-local',
        });
        tenantId = (payload.tenant_id as string) || tenantId;
        actorId = (payload.sub as string) || actorId;
        brandId = (payload.brand_id as string) || brandId;
        roles = Array.isArray(payload.roles) ? (payload.roles as string[]) : roles;
        sessionId = typeof payload.sid === 'string' ? payload.sid : undefined;
      } catch {
        throw new UnauthorizedException(
          AppError.unauthorized('Invalid JWT').message,
        );
      }

      if (sessionId && this.prisma.isReady()) {
        const session = await this.prisma.db.userSession.findFirst({
          where: { id: sessionId, userId: actorId },
        });
        if (!session || session.revokedAt) {
          throw new UnauthorizedException(AppError.unauthorized('Session revoked').message);
        }
        void this.prisma.db.userSession
          .update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } })
          .catch(() => undefined);
      }
    } else if (!bypass) {
      throw new UnauthorizedException('Bearer token required');
    }

    if (!tenantId) {
      throw new UnauthorizedException(AppError.tenantRequired().message);
    }

    req.requestContext = {
      tenantId,
      brandId,
      actorId,
      correlationId,
      traceId,
      roles,
      sessionId,
    };
    return true;
  }
}
