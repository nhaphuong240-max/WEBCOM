import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { ReqContext } from '../common/req-context.decorator';
import { CatalogService } from './catalog.service';

const createSchema = z.object({
  brand_id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  sku_code: z.string().min(1),
  price: z.number().nonnegative(),
  discount_percent: z.number().min(0).max(100).optional(),
  on_hand: z.number().int().nonnegative().optional(),
  media_url: z.string().url().optional(),
});

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('v1/catalog/products')
  @UseGuards(StorefrontContextGuard)
  listStorefront(
    @ReqContext() ctx: RequestContext,
    @Query('brand_id') brandId?: string,
    @Query('q') q?: string,
    @Query('collection') collection?: string,
    @Query('sort') sort?: 'price_asc' | 'price_desc' | 'newest',
  ) {
    return this.catalog.listProducts(ctx.tenantId, {
      brandId: brandId ?? ctx.brandId,
      q,
      collection,
      sort,
    });
  }

  @Get('v1/catalog/products/:idOrSlug')
  @UseGuards(StorefrontContextGuard)
  getStorefront(@ReqContext() ctx: RequestContext, @Param('idOrSlug') idOrSlug: string) {
    return this.catalog.getProduct(ctx.tenantId, idOrSlug);
  }

  @Get('v1/admin/products')
  @UseGuards(TenantAuthGuard)
  listAdmin(
    @ReqContext() ctx: RequestContext,
    @Query('brand_id') brandId?: string,
    @Query('q') q?: string,
  ) {
    return this.catalog.listProducts(ctx.tenantId, { brandId: brandId ?? ctx.brandId, q });
  }

  @Post('v1/admin/products')
  @UseGuards(TenantAuthGuard)
  async createAdmin(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid product', parsed.error.flatten());
    return this.catalog.createProduct(ctx.tenantId, ctx.actorId, {
      brandId: parsed.data.brand_id,
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description,
      skuCode: parsed.data.sku_code,
      price: parsed.data.price,
      discountPercent: parsed.data.discount_percent,
      onHand: parsed.data.on_hand,
      mediaUrl: parsed.data.media_url,
    });
  }
}
