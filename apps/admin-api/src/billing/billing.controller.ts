import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { BillingService } from './billing.service';

@Controller()
@UseGuards(TenantAuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('v1/admin/billing/status')
  status() {
    return this.billing.status();
  }

  @Get('v1/admin/theme-licenses')
  list(@ReqContext() ctx: RequestContext) {
    return this.billing.listLicenses(ctx.tenantId);
  }

  @Get('v1/admin/theme-licenses/quote')
  quote(@ReqContext() ctx: RequestContext, @Query('template_code') code?: string) {
    if (!code) throw AppError.validation('template_code required');
    return this.billing.quote(ctx.tenantId, code);
  }

  @Post('v1/admin/theme-licenses/invoices')
  createInvoice(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z.object({ template_code: z.string().min(1) }).safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid invoice', parsed.error.flatten());
    return this.billing.createInvoice(ctx.tenantId, parsed.data.template_code, ctx.actorId);
  }

  @Get('v1/admin/theme-licenses/invoices/:id')
  getInvoice(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.billing.getInvoice(ctx.tenantId, id);
  }

  @Post('v1/admin/theme-licenses/invoices/:id/simulate-paid')
  simulatePaid(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.billing.simulatePaid(ctx.tenantId, id, ctx.actorId);
  }
}
