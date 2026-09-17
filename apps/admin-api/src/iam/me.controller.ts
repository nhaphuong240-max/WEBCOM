import { Controller, Get, UseGuards } from '@nestjs/common';
import type { RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';

@Controller('v1/me')
@UseGuards(TenantAuthGuard)
export class MeController {
  @Get()
  me(@ReqContext() ctx: RequestContext) {
    return {
      actor_id: ctx.actorId,
      tenant_id: ctx.tenantId,
      brand_id: ctx.brandId ?? null,
      roles: ctx.roles,
      correlation_id: ctx.correlationId,
    };
  }
}
