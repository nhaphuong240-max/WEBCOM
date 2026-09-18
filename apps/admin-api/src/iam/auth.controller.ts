import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { AppError } from '@ptt/shared-kernel';
import { TrialService } from './trial.service';
import { JwtTokenService } from './jwt-token.service';

@Controller()
export class TrialController {
  constructor(private readonly trial: TrialService) {}

  @Get('v1/public/trial/status')
  status() {
    return this.trial.status();
  }

  @Post('v1/public/trial/signup')
  signup(@Body() body: unknown) {
    const parsed = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
        company: z.string().min(1),
        template_code: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid trial signup', parsed.error.flatten());
    return this.trial.signup(parsed.data);
  }

  @Post('v1/auth/login')
  login(@Body() body: unknown) {
    const parsed = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid login', parsed.error.flatten());
    return this.trial.login(parsed.data);
  }
}

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly jwt: JwtTokenService) {}

  @Post('dev-token')
  async devToken(@Body() body: unknown) {
    if (process.env.NODE_ENV === 'production' && process.env.AUTH_DEV_BYPASS !== 'true') {
      return { error: 'Dev token disabled in production' };
    }
    const input = z
      .object({
        tenant_id: z.string().min(1),
        actor_id: z.string().min(1),
        brand_id: z.string().optional(),
        storefront_id: z.string().optional(),
        roles: z.array(z.string()).default(['admin']),
        name: z.string().optional(),
      })
      .parse(body);
    return this.jwt.mint({
      tenantId: input.tenant_id,
      actorId: input.actor_id,
      brandId: input.brand_id,
      storefrontId: input.storefront_id,
      roles: input.roles,
      name: input.name,
    });
  }
}
