import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { CatalogService } from '../catalog/catalog.service';
import { CartService } from '../cart/cart.service';
import { CheckoutService } from '../checkout/checkout.service';
import { CustomerService } from '../customer/customer.service';
import { WebsiteService } from '../website/website.service';
import { HeadlessApiKeyGuard, RequireScope } from './headless-api-key.guard';
import { HeadlessService } from './headless.service';

/**
 * Versioned Headless Storefront API (FR-WCP-013).
 * Auth: Bearer hk_… · scopes · in-memory RPM limit.
 */
@Controller('v1/headless')
export class HeadlessController {
  constructor(
    private readonly headless: HeadlessService,
    private readonly catalog: CatalogService,
    private readonly carts: CartService,
    private readonly checkout: CheckoutService,
    private readonly customers: CustomerService,
    private readonly website: WebsiteService,
  ) {}

  // ── Admin: API key management ──────────────────────────────

  @Post('admin/api-keys')
  @UseGuards(TenantAuthGuard)
  createKey(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        name: z.string().min(1),
        storefront_id: z.string().optional(),
        scopes: z.array(z.string()).optional(),
        rate_limit_rpm: z.number().int().positive().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid API key', parsed.error.flatten());
    return this.headless.createApiKey(
      ctx.tenantId,
      {
        name: parsed.data.name,
        storefrontId: parsed.data.storefront_id,
        scopes: parsed.data.scopes,
        rateLimitRpm: parsed.data.rate_limit_rpm,
      },
      ctx.actorId,
    );
  }

  @Get('admin/api-keys')
  @UseGuards(TenantAuthGuard)
  listKeys(@ReqContext() ctx: RequestContext) {
    return this.headless.listApiKeys(ctx.tenantId);
  }

  @Post('admin/api-keys/:id/revoke')
  @UseGuards(TenantAuthGuard)
  revoke(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.headless.revokeApiKey(ctx.tenantId, id, ctx.actorId);
  }

  @Get('meta')
  @UseGuards(HeadlessApiKeyGuard)
  meta(@ReqContext() ctx: RequestContext) {
    return {
      api_version: 'v1',
      phase: 'W5',
      tenant_id: ctx.tenantId,
      scopes: (ctx as RequestContext & { scopes?: string[] }).scopes || [],
      resources: ['products', 'carts', 'checkout', 'customers', 'content'],
    };
  }

  // ── Products ───────────────────────────────────────────────

  @Get('products')
  @UseGuards(HeadlessApiKeyGuard)
  @RequireScope('product.read')
  products(
    @ReqContext() ctx: RequestContext,
    @Query('q') q?: string,
    @Query('collection') collection?: string,
    @Query('sort') sort?: 'price_asc' | 'price_desc' | 'newest',
  ) {
    return this.catalog.listProducts(ctx.tenantId, {
      brandId: ctx.brandId,
      q,
      collection,
      sort,
    });
  }

  @Get('products/:idOrSlug')
  @UseGuards(HeadlessApiKeyGuard)
  @RequireScope('product.read')
  product(@ReqContext() ctx: RequestContext, @Param('idOrSlug') idOrSlug: string) {
    return this.catalog.getProduct(ctx.tenantId, idOrSlug);
  }

  // ── Cart ───────────────────────────────────────────────────

  @Post('carts')
  @UseGuards(HeadlessApiKeyGuard)
  @RequireScope('cart.write')
  createCart(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({ storefront_id: z.string().min(1), customer_id: z.string().optional() })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('storefront_id required');
    return this.carts.create(ctx.tenantId, parsed.data.storefront_id, parsed.data.customer_id);
  }

  @Get('carts/:cartId')
  @UseGuards(HeadlessApiKeyGuard)
  @RequireScope('cart.write')
  getCart(@ReqContext() ctx: RequestContext, @Param('cartId') cartId: string) {
    return this.carts.getPriced(ctx.tenantId, cartId);
  }

  @Post('carts/:cartId/items')
  @UseGuards(HeadlessApiKeyGuard)
  @RequireScope('cart.write')
  addItem(
    @ReqContext() ctx: RequestContext,
    @Param('cartId') cartId: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({ sku_id: z.string().min(1), qty: z.number().int().positive().default(1) })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid item', parsed.error.flatten());
    return this.carts.addItem(ctx.tenantId, cartId, parsed.data.sku_id, parsed.data.qty);
  }

  // ── Checkout ───────────────────────────────────────────────

  @Post('checkout')
  @UseGuards(HeadlessApiKeyGuard)
  @RequireScope('checkout.write')
  async doCheckout(
    @ReqContext() ctx: RequestContext,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) throw AppError.validation('Idempotency-Key header required');
    const parsed = z
      .object({
        cart_id: z.string().min(1),
        payment_method: z.enum(['COD', 'TRANSFER']).default('COD'),
        shipping_name: z.string().min(1),
        shipping_phone: z.string().min(8),
        shipping_address: z.string().min(3),
        shipping_city: z.string().optional(),
        note: z.string().optional(),
        customer_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid checkout', parsed.error.flatten());
    return this.checkout.checkout(ctx.tenantId, ctx.actorId, {
      cartId: parsed.data.cart_id,
      paymentMethod: parsed.data.payment_method,
      shippingName: parsed.data.shipping_name,
      shippingPhone: parsed.data.shipping_phone,
      shippingAddress: parsed.data.shipping_address,
      shippingCity: parsed.data.shipping_city,
      note: parsed.data.note,
      customerId: parsed.data.customer_id,
      idempotencyKey,
    });
  }

  // ── Customer ───────────────────────────────────────────────

  @Post('customers/register')
  @UseGuards(HeadlessApiKeyGuard)
  @RequireScope('customer.write')
  register(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
        password: z.string().min(6),
        name: z.string().optional(),
        consent_marketing: z.boolean().default(true),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid register', parsed.error.flatten());
    return this.customers.register(ctx.tenantId, {
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: parsed.data.password,
      name: parsed.data.name,
      consentMarketing: parsed.data.consent_marketing,
    });
  }

  // ── Content ────────────────────────────────────────────────

  @Get('storefronts/:idOrSlug/runtime')
  @UseGuards(HeadlessApiKeyGuard)
  @RequireScope('content.read')
  runtime(@ReqContext() ctx: RequestContext, @Param('idOrSlug') idOrSlug: string) {
    return this.website.getRuntime(ctx.tenantId, idOrSlug);
  }

  @Get('storefronts/:idOrSlug/pages/:slug')
  @UseGuards(HeadlessApiKeyGuard)
  @RequireScope('content.read')
  page(
    @ReqContext() ctx: RequestContext,
    @Param('idOrSlug') idOrSlug: string,
    @Param('slug') slug: string,
  ) {
    return this.website.getPublishedPage(ctx.tenantId, idOrSlug, slug);
  }
}
