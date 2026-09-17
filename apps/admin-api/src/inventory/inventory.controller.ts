import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { InventoryService } from './inventory.service';

const adjustSchema = z.object({
  delta: z.number().int(),
  reason: z.string().min(1).default('manual_adjust'),
});

@Controller('v1/admin/inventory')
@UseGuards(TenantAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get(':skuId')
  get(@ReqContext() ctx: RequestContext, @Param('skuId') skuId: string) {
    return this.inventory.getBalance(ctx.tenantId, skuId);
  }

  @Post(':skuId/adjust')
  async adjust(
    @ReqContext() ctx: RequestContext,
    @Param('skuId') skuId: string,
    @Body() body: unknown,
  ) {
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid adjust', parsed.error.flatten());
    return this.inventory.adjustOnHand(
      ctx.tenantId,
      ctx.actorId,
      skuId,
      parsed.data.delta,
      parsed.data.reason,
    );
  }
}
