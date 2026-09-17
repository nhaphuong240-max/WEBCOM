import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { ReqContext } from '../common/req-context.decorator';
import { CustomerService } from './customer.service';

@Controller('v1/customers')
@UseGuards(StorefrontContextGuard)
export class CustomerController {
  constructor(private readonly customers: CustomerService) {}

  @Post('register')
  register(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        email: z.string().email().optional(),
        phone: z.string().min(8).optional(),
        password: z.string().min(6),
        name: z.string().optional(),
        consent_marketing: z.boolean(),
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

  @Post('login')
  login(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
        password: z.string().min(1),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid login', parsed.error.flatten());
    return this.customers.login(ctx.tenantId, parsed.data);
  }

  @Post('login-otp')
  loginOtp(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({ phone: z.string().min(8), otp: z.string().min(4) })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid OTP login', parsed.error.flatten());
    return this.customers.loginOtp(ctx.tenantId, parsed.data.phone, parsed.data.otp);
  }
}
