import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { AppError, createId } from '@ptt/shared-kernel';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PlatformService } from '../website/platform.service';
import { WebsiteService } from '../website/website.service';
import { JwtTokenService } from './jwt-token.service';

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'shop';
}

@Injectable()
export class TrialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jwt: JwtTokenService,
    private readonly platform: PlatformService,
    private readonly website: WebsiteService,
  ) {}

  status() {
    return {
      wave: 'P2',
      features: {
        self_serve_trial: true,
        trial_before_paywall: true,
        monetize: 'theme_license',
        email_verification: false,
      },
    };
  }

  async signup(input: {
    email: string;
    password: string;
    name?: string;
    company: string;
    template_code?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    if (input.password.length < 8) {
      throw AppError.validation('password must be at least 8 characters');
    }
    const existing = await this.prisma.db.user.findFirst({ where: { email } });
    if (existing) throw AppError.conflict('Email already registered');

    let baseSlug = slugify(input.company);
    let slug = baseSlug;
    let n = 0;
    while (await this.prisma.db.tenant.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const tenantId = createId('ten');
    const brandId = createId('brd');
    const userId = createId('usr');
    const storefrontId = createId('sf');
    const brandCode = slug.replace(/-/g, '').slice(0, 12).toUpperCase() || 'BRAND';

    await this.prisma.db.$transaction(async (tx) => {
      await tx.tenant.create({
        data: {
          id: tenantId,
          name: input.company.trim(),
          slug,
          status: 'trial',
        },
      });
      await tx.brand.create({
        data: {
          id: brandId,
          tenantId,
          code: brandCode,
          name: input.company.trim(),
        },
      });
      await tx.user.create({
        data: {
          id: userId,
          tenantId,
          email,
          name: (input.name || input.company).trim(),
          passwordHash,
          roles: ['admin'],
          status: 'active',
          activatedAt: new Date(),
        },
      });
      await tx.userRoleAssignment.create({
        data: {
          id: createId('ura'),
          tenantId,
          userId,
          roleCode: 'admin',
          scope: { type: 'tenant' },
        },
      });
      await tx.storefront.create({
        data: {
          id: storefrontId,
          tenantId,
          brandId,
          name: `${input.company.trim()} Shop`,
          slug: `${slug}-shop`,
          status: 'staging',
        },
      });
      await tx.onboardingProgress.create({
        data: {
          id: createId('onb'),
          tenantId,
          storefrontId,
          currentStep: 'brand_kit',
          completed: {},
        },
      });
    });

    // Theme bootstrap outside txn (may call Temporal / multi writes)
    try {
      if (input.template_code) {
        const tpl = await this.prisma.db.templateCatalog.findFirst({
          where: { OR: [{ code: input.template_code }, { id: input.template_code }], active: true },
        });
        if (tpl?.license === 'free') {
          await this.platform.installTemplate(
            tenantId,
            storefrontId,
            input.template_code,
            userId,
          );
        } else {
          // Paid theme: install after P3 license purchase
          await this.website.ensureAuraLite(tenantId, storefrontId, userId);
        }
      } else {
        await this.website.ensureAuraLite(tenantId, storefrontId, userId);
      }
    } catch {
      // Trial still usable; onboarding can install template later
    }

    await this.audit.write({
      tenantId,
      actorId: userId,
      action: 'trial.signup',
      entity: 'tenant',
      entityId: tenantId,
      payload: {
        email,
        storefront_id: storefrontId,
        template_code: input.template_code || null,
        trial_before_paywall: true,
      },
    });

    const token = await this.jwt.mint({
      tenantId,
      actorId: userId,
      brandId,
      storefrontId,
      roles: ['admin'],
      name: input.name || input.company,
    });

    return {
      ...token,
      tenant_id: tenantId,
      brand_id: brandId,
      storefront_id: storefrontId,
      user_id: userId,
      tenant_slug: slug,
      trial: true,
      redirect_url: '/console/auth/callback',
      onboarding_path: '/console/website/onboarding',
    };
  }

  async login(input: {
    email: string;
    password: string;
    ip?: string;
    userAgent?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.db.user.findFirst({
      where: { email, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    const fail = async (reason: string) => {
      await this.prisma.db.loginEvent.create({
        data: {
          id: createId('lge'),
          tenantId: user?.tenantId || null,
          userId: user?.id || null,
          email,
          success: false,
          reason,
          ip: input.ip || null,
          userAgent: input.userAgent || null,
        },
      });
      throw AppError.unauthorized('Invalid credentials');
    };

    if (!user?.passwordHash) await fail('no_password');
    const ok = await bcrypt.compare(input.password, user!.passwordHash!);
    if (!ok) await fail('bad_password');

    if (user!.mfaEnabled && process.env.FEATURE_HR_MFA === 'true') {
      // stub: production would require TOTP; HR-2 only records flag
    }

    await this.prisma.db.user.update({
      where: { id: user!.id },
      data: { lastLoginAt: new Date() },
    });

    const assignments = await this.prisma.db.userRoleAssignment.findMany({
      where: { userId: user!.id, tenantId: user!.tenantId },
    });
    const roles = assignments.length
      ? assignments.map((a) => a.roleCode)
      : user!.roles.length
        ? user!.roles
        : ['admin'];

    const sf = await this.prisma.db.storefront.findFirst({
      where: { tenantId: user!.tenantId },
      orderBy: { createdAt: 'asc' },
    });
    const brand = await this.prisma.db.brand.findFirst({
      where: { tenantId: user!.tenantId },
      orderBy: { createdAt: 'asc' },
    });

    const sessionId = createId('uss');
    await this.prisma.db.userSession.create({
      data: {
        id: sessionId,
        tenantId: user!.tenantId,
        userId: user!.id,
        ip: input.ip || null,
        userAgent: input.userAgent || null,
      },
    });

    const token = await this.jwt.mint({
      tenantId: user!.tenantId,
      actorId: user!.id,
      brandId: brand?.id || sf?.brandId,
      storefrontId: sf?.id,
      roles,
      name: user!.name,
      sessionId,
    });

    await this.prisma.db.userSession.update({
      where: { id: sessionId },
      data: {
        tokenHash: createHash('sha256').update(token.access_token).digest('hex'),
      },
    });

    await this.prisma.db.loginEvent.create({
      data: {
        id: createId('lge'),
        tenantId: user!.tenantId,
        userId: user!.id,
        email,
        success: true,
        ip: input.ip || null,
        userAgent: input.userAgent || null,
      },
    });

    return {
      ...token,
      tenant_id: user!.tenantId,
      brand_id: brand?.id || sf?.brandId || null,
      storefront_id: sf?.id || null,
      user_id: user!.id,
      redirect_url: '/console/auth/callback',
      onboarding_path: '/console/website/onboarding',
    };
  }
}
