import { Injectable } from '@nestjs/common';
import { SignJWT } from 'jose';

@Injectable()
export class JwtTokenService {
  async mint(input: {
    tenantId: string;
    actorId: string;
    brandId?: string;
    storefrontId?: string;
    roles?: string[];
    name?: string;
    sessionId?: string;
  }) {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? 'ptt-w0-dev-secret-change-me',
    );
    const roles = input.roles?.length ? input.roles : ['admin'];
    const token = await new SignJWT({
      tenant_id: input.tenantId,
      brand_id: input.brandId,
      storefront_id: input.storefrontId,
      roles,
      name: input.name ?? 'User',
      ...(input.sessionId ? { sid: input.sessionId } : {}),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(input.actorId)
      .setIssuer(process.env.JWT_ISSUER ?? 'ptt-local')
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(secret);

    return {
      access_token: token,
      token_type: 'Bearer' as const,
      expires_in: 43200,
      session_id: input.sessionId ?? null,
      claims: {
        tenant_id: input.tenantId,
        actor_id: input.actorId,
        brand_id: input.brandId,
        storefront_id: input.storefrontId,
        roles,
        sid: input.sessionId ?? null,
      },
    };
  }
}
