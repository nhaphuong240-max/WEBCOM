import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { CheckoutRateLimitGuard } from '../common/checkout-rate-limit.guard';
import { ReqContext } from '../common/req-context.decorator';
import { CheckoutService } from './checkout.service';

const schema = z.object({
  cart_id: z.string().min(1),
  payment_method: z.enum(['COD', 'TRANSFER']).default('COD'),
  shipping_name: z.string().min(1),
  shipping_phone: z.string().min(8),
  shipping_address: z.string().min(3),
  shipping_city: z.string().optional(),
  shipping_carrier: z.string().optional(),
  shipping_service: z.string().optional(),
  voucher_code: z.string().optional(),
  note: z.string().optional(),
  customer_id: z.string().optional(),
  loyalty_points: z.number().int().positive().optional(),
  client_total: z.number().optional(),
});

@Controller('v1/checkout')
@UseGuards(StorefrontContextGuard, CheckoutRateLimitGuard)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post()
  async create(
    @ReqContext() ctx: RequestContext,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) throw AppError.validation('Idempotency-Key header required');
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid checkout', parsed.error.flatten());
    return this.checkout.checkout(ctx.tenantId, ctx.actorId, {
      cartId: parsed.data.cart_id,
      paymentMethod: parsed.data.payment_method,
      shippingName: parsed.data.shipping_name,
      shippingPhone: parsed.data.shipping_phone,
      shippingAddress: parsed.data.shipping_address,
      shippingCity: parsed.data.shipping_city,
      shippingCarrier: parsed.data.shipping_carrier,
      shippingService: parsed.data.shipping_service,
      voucherCode: parsed.data.voucher_code,
      note: parsed.data.note,
      customerId: parsed.data.customer_id,
      loyaltyPoints: parsed.data.loyalty_points,
      clientTotal: parsed.data.client_total,
      idempotencyKey,
    });
  }
}
