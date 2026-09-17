import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { TemporalService } from './temporal.service';
import { TemporalWorkflowsService } from './temporal-workflows.service';

@Controller()
export class TemporalController {
  constructor(
    private readonly temporal: TemporalService,
    private readonly workflows: TemporalWorkflowsService,
  ) {}

  @Get('v1/admin/temporal/status')
  @UseGuards(TenantAuthGuard)
  status() {
    return this.temporal.status();
  }

  @Get('v1/admin/temporal/runs/:workflowId')
  @UseGuards(TenantAuthGuard)
  run(@Param('workflowId') workflowId: string) {
    return this.temporal.getRun(workflowId) || { workflow_id: workflowId, status: 'unknown' };
  }

  @Get('v1/admin/publish-jobs/:id')
  @UseGuards(TenantAuthGuard)
  job(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.workflows.getPublishJob(ctx.tenantId, id);
  }
}
