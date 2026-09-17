import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { PosService } from './pos.service';

const tender = z.enum(['cash', 'COD', 'TRANSFER']);

@Controller()
@UseGuards(TenantAuthGuard)
export class PosController {
  constructor(private readonly pos: PosService) {}

  @Get('v1/admin/pos/status')
  status() {
    return this.pos.status();
  }

  @Post('v1/admin/pos/locations/ensure')
  ensure(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        code: z.string().optional(),
        name: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        register_code: z.string().optional(),
      })
      .safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid location', parsed.error.flatten());
    return this.pos.ensureStore(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/pos/locations')
  listLocations(@ReqContext() ctx: RequestContext) {
    return this.pos.listLocations(ctx.tenantId);
  }

  @Get('v1/admin/pos/locations/:id/stock')
  locationStock(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.pos.getLocationStock(ctx.tenantId, id);
  }

  @Post('v1/admin/pos/shifts/open')
  openShift(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        register_id: z.string().min(1),
        opening_cash: z.number().nonnegative().optional(),
        cashier_id: z.string().optional(),
        note: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid open shift', parsed.error.flatten());
    return this.pos.openShift(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/pos/shifts/open')
  getOpen(
    @ReqContext() ctx: RequestContext,
    @Query('register_id') registerId: string,
  ) {
    if (!registerId) throw AppError.validation('register_id required');
    return this.pos.getOpenShift(ctx.tenantId, registerId);
  }

  @Post('v1/admin/pos/shifts/:id/close')
  closeShift(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        closing_cash: z.number().nonnegative(),
        note: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid close shift', parsed.error.flatten());
    return this.pos.closeShift(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/pos/lookup')
  lookup(
    @ReqContext() ctx: RequestContext,
    @Query('q') q: string,
    @Query('location_id') locationId?: string,
  ) {
    return this.pos.lookup(ctx.tenantId, q || '', locationId);
  }

  @Post('v1/admin/pos/sales')
  createSale(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        shift_id: z.string().min(1),
        lines: z
          .array(
            z.object({
              sku_id: z.string().min(1),
              qty: z.number().int().positive(),
              unit_price: z.number().nonnegative().optional(),
            }),
          )
          .min(1),
        payments: z
          .array(
            z.object({
              method: tender,
              amount: z.number().positive(),
            }),
          )
          .min(1),
        customer_name: z.string().optional(),
        customer_phone: z.string().optional(),
        discount_amount: z.number().nonnegative().optional(),
        note: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid sale', parsed.error.flatten());
    return this.pos.createSale(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/pos/sales')
  listSales(
    @ReqContext() ctx: RequestContext,
    @Query('shift_id') shiftId?: string,
    @Query('location_id') locationId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pos.listSales(ctx.tenantId, {
      shift_id: shiftId,
      location_id: locationId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('v1/admin/pos/sales/:id')
  getSale(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.pos.getSale(ctx.tenantId, id);
  }

  @Post('v1/admin/pos/returns')
  createReturn(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        sale_id: z.string().min(1),
        lines: z
          .array(
            z.object({
              sku_id: z.string().min(1),
              qty: z.number().int().positive(),
            }),
          )
          .min(1),
        reason: z.string().optional(),
        refund_tender: tender.optional(),
        shift_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid return', parsed.error.flatten());
    return this.pos.createReturn(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/pos/transfers')
  transfer(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        from_location_id: z.string().min(1),
        to_location_id: z.string().min(1),
        sku_id: z.string().min(1),
        qty: z.number().int().positive(),
        reason: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid transfer', parsed.error.flatten());
    return this.pos.transferStock(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/pos/transfers')
  listTransfers(@ReqContext() ctx: RequestContext, @Query('limit') limit?: string) {
    return this.pos.listTransfers(ctx.tenantId, limit ? Number(limit) : undefined);
  }
}
