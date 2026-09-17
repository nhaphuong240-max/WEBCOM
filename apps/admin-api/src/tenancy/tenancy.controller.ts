import { Controller, Get, UseGuards } from '@nestjs/common';
import type { RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';

/**
 * W0 smoke: proves tenant context is mandatory and echoed.
 * Isolation DB queries land in W1.
 */
@Controller('v1/tenancy')
@UseGuards(TenantAuthGuard)
export class TenancyController {
  @Get('context')
  context(@ReqContext() ctx: RequestContext) {
    return {
      ok: true,
      tenant_id: ctx.tenantId,
      actor_id: ctx.actorId,
      brand_id: ctx.brandId ?? null,
      correlation_id: ctx.correlationId,
      message: 'Tenant boundary enforced at API middleware',
    };
  }
}
