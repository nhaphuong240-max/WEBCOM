import { Controller, Get, UseGuards } from '@nestjs/common';
import type { RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { HrIamService } from '../hr/hr-iam.service';
import { hrFeature } from '../hr/hr-access';

@Controller('v1/me')
@UseGuards(TenantAuthGuard)
export class MeController {
  constructor(private readonly hr: HrIamService) {}

  @Get()
  async me(@ReqContext() ctx: RequestContext) {
    if (hrFeature('hr.iam')) {
      try {
        const profile = await this.hr.me(ctx);
        return { ...profile, correlation_id: ctx.correlationId };
      } catch {
        /* fall through */
      }
    }
    return {
      actor_id: ctx.actorId,
      tenant_id: ctx.tenantId,
      brand_id: ctx.brandId ?? null,
      roles: ctx.roles,
      correlation_id: ctx.correlationId,
    };
  }
}
