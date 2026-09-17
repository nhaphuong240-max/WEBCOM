import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { CONTEXT_HEADERS, AppError, createId, type RequestContext } from '@ptt/shared-kernel';
import { PrismaService } from '../prisma/prisma.service';

type HeadlessReq = {
  headers: Record<string, string | string[] | undefined>;
  requestContext?: RequestContext & {
    apiKeyId?: string;
    scopes?: string[];
    rateLimitRpm?: number;
  };
  ip?: string;
};

function header(req: HeadlessReq, name: string): string | undefined {
  const v = req.headers[name] ?? req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

function hashKey(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

function rateLimit(key: string, rpm: number) {
  const now = Date.now();
  const slot = buckets.get(key);
  if (!slot || slot.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }
  slot.count += 1;
  if (slot.count > rpm) {
    throw new HttpException(
      AppError.validation('Rate limit exceeded', { rpm }).message,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/** Headless APIs: Authorization Bearer hk_… or x-api-key + required scope via Reflector optional. */
@Injectable()
export class HeadlessApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<HeadlessReq>();
    const auth = header(req, 'authorization');
    const raw =
      (auth?.startsWith('Bearer ') ? auth.slice(7) : undefined) ||
      header(req, 'x-api-key');
    if (!raw || !raw.startsWith('hk_')) {
      throw new UnauthorizedException(AppError.unauthorized('API key required (hk_…)').message);
    }
    const prefix = raw.slice(0, 16);
    const rows = await this.prisma.db.apiKey.findMany({
      where: { keyPrefix: prefix, status: 'active' },
      take: 5,
    });
    const hash = hashKey(raw);
    const match = rows.find((r) => {
      try {
        return timingSafeEqual(Buffer.from(r.keyHash), Buffer.from(hash));
      } catch {
        return r.keyHash === hash;
      }
    });
    if (!match) {
      throw new UnauthorizedException(AppError.unauthorized('Invalid API key').message);
    }

    rateLimit(`hk:${match.id}`, match.rateLimitRpm);

    // Optional required scope from handler metadata
    const required: string | undefined = Reflect.getMetadata(
      'headless_scope',
      context.getHandler(),
    );
    if (required && !match.scopes.includes(required) && !match.scopes.includes('*')) {
      throw new UnauthorizedException(AppError.forbidden(`Missing scope: ${required}`).message);
    }

    await this.prisma.db.apiKey.update({
      where: { id: match.id },
      data: { lastUsedAt: new Date() },
    });

    req.requestContext = {
      tenantId: match.tenantId,
      brandId: header(req, CONTEXT_HEADERS.brandId),
      actorId: `apikey:${match.id}`,
      correlationId: header(req, CONTEXT_HEADERS.correlationId) ?? createId('cor'),
      traceId: header(req, CONTEXT_HEADERS.traceId),
      roles: ['headless', ...match.scopes],
      apiKeyId: match.id,
      scopes: match.scopes,
      rateLimitRpm: match.rateLimitRpm,
    };
    return true;
  }
}

export function RequireScope(scope: string): MethodDecorator {
  return (_target, _key, descriptor) => {
    Reflect.defineMetadata('headless_scope', scope, descriptor.value as object);
    return descriptor;
  };
}

export { hashKey };
