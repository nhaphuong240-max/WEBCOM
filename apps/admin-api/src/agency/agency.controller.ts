import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { AgencyService } from './agency.service';

@Controller()
@UseGuards(TenantAuthGuard)
export class AgencyController {
  constructor(private readonly agency: AgencyService) {}

  @Get('v1/admin/storefronts/:id/agency/deliveries')
  list(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.agency.list(ctx.tenantId, id);
  }

  @Post('v1/admin/storefronts/:id/agency/deliveries')
  submit(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        title: z.string().min(1),
        agency_name: z.string().min(1),
        notes: z.string().optional(),
        white_label_host: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid delivery', parsed.error.flatten());
    return this.agency.submit(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/agency/deliveries/:id/transition')
  transition(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        status: z.enum([
          'submitted',
          'in_review',
          'accepted',
          'installed',
          'staging',
          'published',
          'rejected',
        ]),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid transition', parsed.error.flatten());
    return this.agency.transition(ctx.tenantId, id, parsed.data.status, ctx.actorId);
  }

  @Post('v1/admin/agency/deliveries/:id/annotations')
  annotate(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        author: z.string().min(1),
        body: z.string().min(1),
        x: z.number().optional(),
        y: z.number().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid annotation', parsed.error.flatten());
    return this.agency.annotate(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/storefronts/:id/preview-token/revoke')
  revoke(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z.object({ token: z.string().min(8) }).safeParse(body);
    if (!parsed.success) throw AppError.validation('token required');
    return this.agency.revokePreview(ctx.tenantId, id, parsed.data.token, ctx.actorId);
  }
}
