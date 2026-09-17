import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { ReqContext } from '../common/req-context.decorator';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('v1/orders/:orderId')
  @UseGuards(StorefrontContextGuard)
  getStore(@ReqContext() ctx: RequestContext, @Param('orderId') orderId: string) {
    return this.orders.get(ctx.tenantId, orderId);
  }

  @Get('v1/admin/orders')
  @UseGuards(TenantAuthGuard)
  list(@ReqContext() ctx: RequestContext) {
    return this.orders.list(ctx.tenantId);
  }

  @Get('v1/admin/orders/:orderId')
  @UseGuards(TenantAuthGuard)
  getAdmin(@ReqContext() ctx: RequestContext, @Param('orderId') orderId: string) {
    return this.orders.get(ctx.tenantId, orderId);
  }

  @Post('v1/admin/orders/:orderId/transition')
  @UseGuards(TenantAuthGuard)
  transition(
    @ReqContext() ctx: RequestContext,
    @Param('orderId') orderId: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({ status: z.enum(['FULFILLING', 'SHIPPED', 'COMPLETED', 'CANCELLED']) })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid status', parsed.error.flatten());
    return this.orders.transition(ctx.tenantId, ctx.actorId, orderId, parsed.data.status);
  }
}
