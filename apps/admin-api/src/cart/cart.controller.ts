import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { ReqContext } from '../common/req-context.decorator';
import { CartService } from './cart.service';

@Controller('v1/carts')
@UseGuards(StorefrontContextGuard)
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Post()
  create(
    @ReqContext() ctx: RequestContext,
    @Body() body: { storefront_id?: string; customer_id?: string },
  ) {
    if (!body.storefront_id) throw AppError.validation('storefront_id required');
    return this.carts.create(ctx.tenantId, body.storefront_id, body.customer_id);
  }

  @Get(':cartId')
  get(@ReqContext() ctx: RequestContext, @Param('cartId') cartId: string) {
    return this.carts.getPriced(ctx.tenantId, cartId);
  }

  @Post(':cartId/items')
  add(
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

  @Patch(':cartId/items/:lineId')
  update(
    @ReqContext() ctx: RequestContext,
    @Param('cartId') cartId: string,
    @Param('lineId') lineId: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({ qty: z.number().int() }).safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid qty', parsed.error.flatten());
    return this.carts.updateItem(ctx.tenantId, cartId, lineId, parsed.data.qty);
  }

  @Delete(':cartId/items/:lineId')
  remove(
    @ReqContext() ctx: RequestContext,
    @Param('cartId') cartId: string,
    @Param('lineId') lineId: string,
  ) {
    return this.carts.removeItem(ctx.tenantId, cartId, lineId);
  }
}
