import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AppError } from '@ptt/shared-kernel';

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Simple IP RPM throttle for checkout (WAF-lite). */
@Injectable()
export class CheckoutRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const rpm = Number(process.env.CHECKOUT_RATE_LIMIT_RPM || 30);
    const xf = req.headers['x-forwarded-for'];
    const ip =
      req.ip ||
      (Array.isArray(xf) ? xf[0] : xf?.split(',')[0]?.trim()) ||
      'unknown';
    const key = `checkout:${ip}`;
    const now = Date.now();
    const slot = buckets.get(key);
    if (!slot || slot.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    slot.count += 1;
    if (slot.count > rpm) {
      throw new HttpException(
        AppError.validation('Checkout rate limit exceeded').message,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
