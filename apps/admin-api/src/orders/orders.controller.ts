import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { ReqContext } from '../common/req-context.decorator';
import { HrIamService } from '../hr/hr-iam.service';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly hr: HrIamService,
  ) {}

  @Get('v1/orders/:orderId')
  @UseGuards(StorefrontContextGuard)
  getStore(@ReqContext() ctx: RequestContext, @Param('orderId') orderId: string) {
    return this.orders.get(ctx.tenantId, orderId);
  }

  @Get('v1/admin/orders')
  @UseGuards(TenantAuthGuard)
  async list(@ReqContext() ctx: RequestContext) {
    const storefrontIds = await this.hr.allowedStorefrontIds(ctx);
    return this.orders.list(ctx.tenantId, storefrontIds);
  }

  @Get('v1/admin/orders/:orderId')
  @UseGuards(TenantAuthGuard)
  async getAdmin(@ReqContext() ctx: RequestContext, @Param('orderId') orderId: string) {
    const order = await this.orders.get(ctx.tenantId, orderId);
    await this.hr.assertStorefrontAccess(ctx, order.storefront_id);
    return order;
  }

  @Post('v1/admin/orders/:orderId/transition')
  @UseGuards(TenantAuthGuard)
  async transition(
    @ReqContext() ctx: RequestContext,
    @Param('orderId') orderId: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({ status: z.enum(['FULFILLING', 'SHIPPED', 'COMPLETED', 'CANCELLED']) })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid status', parsed.error.flatten());
    const order = await this.orders.get(ctx.tenantId, orderId);
    await this.hr.assertStorefrontAccess(ctx, order.storefront_id);
    return this.orders.transition(ctx.tenantId, ctx.actorId, orderId, parsed.data.status);
  }
}
