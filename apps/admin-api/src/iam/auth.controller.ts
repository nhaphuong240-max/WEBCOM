import { Body, Controller, Post } from '@nestjs/common';
import { SignJWT } from 'jose';
import { z } from 'zod';

const DevLoginSchema = z.object({
  tenant_id: z.string().min(1),
  actor_id: z.string().min(1),
  brand_id: z.string().optional(),
  roles: z.array(z.string()).default(['admin']),
  name: z.string().optional(),
});

@Controller('v1/auth')
export class AuthController {
  @Post('dev-token')
  async devToken(@Body() body: unknown) {
    if (process.env.NODE_ENV === 'production' && process.env.AUTH_DEV_BYPASS !== 'true') {
      return { error: 'Dev token disabled in production' };
    }
    const input = DevLoginSchema.parse(body);
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? 'ptt-w0-dev-secret-change-me',
    );
    const token = await new SignJWT({
      tenant_id: input.tenant_id,
      brand_id: input.brand_id,
      roles: input.roles,
      name: input.name ?? 'Dev User',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(input.actor_id)
      .setIssuer(process.env.JWT_ISSUER ?? 'ptt-local')
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(secret);

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 43200,
      claims: {
        tenant_id: input.tenant_id,
        actor_id: input.actor_id,
        brand_id: input.brand_id,
        roles: input.roles,
      },
    };
  }
}
