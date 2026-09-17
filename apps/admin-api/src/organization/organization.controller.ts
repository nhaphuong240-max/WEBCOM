import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, createId, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { ReqContext } from '../common/req-context.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class OrganizationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('v1/storefronts')
  @UseGuards(StorefrontContextGuard)
  async listPublic(@ReqContext() ctx: RequestContext) {
    const rows = await this.prisma.db.storefront.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((s) => ({
      id: s.id,
      brand_id: s.brandId,
      name: s.name,
      slug: s.slug,
      status: s.status,
    }));
  }

  @Get('v1/admin/brands')
  @UseGuards(TenantAuthGuard)
  async brands(@ReqContext() ctx: RequestContext) {
    return this.prisma.db.brand.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('v1/admin/storefronts')
  @UseGuards(TenantAuthGuard)
  async createStorefront(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        brand_id: z.string().min(1),
        name: z.string().min(1),
        slug: z.string().min(1),
        status: z.enum(['draft', 'staging', 'published']).default('draft'),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid storefront', parsed.error.flatten());
    const brand = await this.prisma.db.brand.findFirst({
      where: { id: parsed.data.brand_id, tenantId: ctx.tenantId },
    });
    if (!brand) throw AppError.notFound('Brand not found');
    return this.prisma.db.storefront.create({
      data: {
        id: createId('sf'),
        tenantId: ctx.tenantId,
        brandId: parsed.data.brand_id,
        name: parsed.data.name,
        slug: parsed.data.slug,
        status: parsed.data.status,
      },
    });
  }
}
