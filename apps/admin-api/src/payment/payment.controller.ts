import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { PaymentService } from './payment.service';

@Controller()
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Get('v1/orders/:orderId/payment')
  @UseGuards(StorefrontContextGuard)
  forOrder(@ReqContext() ctx: RequestContext, @Param('orderId') orderId: string) {
    return this.payments.getLatestForOrder(ctx.tenantId, orderId);
  }

  @Get('v1/payments/intents/:id')
  @UseGuards(StorefrontContextGuard)
  intent(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.payments.getIntent(ctx.tenantId, id);
  }

  @Post('v1/payments/intents/:id/simulate-paid')
  @UseGuards(StorefrontContextGuard)
  simulate(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.payments.simulatePaid(ctx.tenantId, id, ctx.actorId);
  }

  /** Public webhook — no tenant JWT; signature verified. */
  @Post('v1/payments/webhooks/:provider')
  webhook(
    @Param('provider') provider: string,
    @Req() req: { body?: unknown; rawBody?: Buffer | string },
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const raw =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : Buffer.isBuffer(req.rawBody)
          ? req.rawBody.toString('utf8')
          : JSON.stringify(req.body ?? {});
    return this.payments.handleWebhook(provider, raw, headers);
  }

  @Post('v1/admin/payments/webhooks/:provider/test')
  @UseGuards(TenantAuthGuard)
  adminTestWebhook(
    @ReqContext() ctx: RequestContext,
    @Param('provider') provider: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        event_id: z.string().min(1),
        order_id: z.string().optional(),
        provider_ref: z.string().optional(),
        amount: z.number().optional(),
        status: z.literal('paid').default('paid'),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid webhook test', parsed.error.flatten());
    const payload = JSON.stringify({ ...parsed.data, tenant_id: ctx.tenantId });
    return this.payments.handleWebhook(provider, payload, {
      'x-ptt-webhook-secret': process.env.PAYMENT_WEBHOOK_SECRET || 'ptt-dev-webhook-secret',
    });
  }
}
