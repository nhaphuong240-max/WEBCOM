import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { JourneyService } from './journey.service';

const stepSchema = z.object({
  kind: z.enum(['trigger', 'condition', 'delay', 'action', 'exit']),
  config: z.record(z.unknown()).optional(),
  sort_order: z.number().int().optional(),
});

@Controller()
@UseGuards(TenantAuthGuard)
export class JourneyController {
  constructor(private readonly journeys: JourneyService) {}

  @Get('v1/admin/journeys/status')
  status() {
    return this.journeys.status();
  }

  @Get('v1/admin/journeys')
  list(@ReqContext() ctx: RequestContext) {
    return this.journeys.list(ctx.tenantId);
  }

  @Post('v1/admin/journeys/drain')
  drain(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        journey_id: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
      .safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid drain', parsed.error.flatten());
    return this.journeys.drain(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/journey-enrollments/:enrollmentId/logs')
  logs(
    @ReqContext() ctx: RequestContext,
    @Param('enrollmentId') enrollmentId: string,
    @Query('limit') limit?: string,
  ) {
    return this.journeys.listLogs(ctx.tenantId, enrollmentId, limit ? Number(limit) : 50);
  }

  @Post('v1/admin/journeys')
  create(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        status: z.string().optional(),
        trigger_type: z.string().optional(),
        trigger_config: z.record(z.unknown()).optional(),
        required_consent: z.array(z.string()).optional(),
        frequency_cap_days: z.number().int().nonnegative().optional(),
        frequency_cap_count: z.number().int().positive().optional(),
        steps: z.array(stepSchema).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid journey', parsed.error.flatten());
    return this.journeys.create(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/journeys/:id')
  get(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.journeys.get(ctx.tenantId, id);
  }

  @Patch('v1/admin/journeys/:id')
  update(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        status: z.string().optional(),
        trigger_type: z.string().optional(),
        trigger_config: z.record(z.unknown()).optional(),
        required_consent: z.array(z.string()).optional(),
        frequency_cap_days: z.number().int().nonnegative().optional(),
        frequency_cap_count: z.number().int().positive().optional(),
        steps: z.array(stepSchema).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid journey update', parsed.error.flatten());
    return this.journeys.update(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Delete('v1/admin/journeys/:id')
  remove(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.journeys.remove(ctx.tenantId, id, ctx.actorId);
  }

  @Post('v1/admin/journeys/:id/enroll')
  enroll(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        customer_id: z.string().min(1),
        skip_drain: z.boolean().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid enroll', parsed.error.flatten());
    return this.journeys.enroll(ctx.tenantId, id, parsed.data.customer_id, ctx.actorId, {
      skip_drain: parsed.data.skip_drain,
    });
  }

  @Get('v1/admin/journeys/:id/enrollments')
  enrollments(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.journeys.listEnrollments(ctx.tenantId, id, limit ? Number(limit) : 50);
  }
}
