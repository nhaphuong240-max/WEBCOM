import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { AiService } from './ai.service';

@Controller()
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('v1/admin/ai/status')
  @UseGuards(TenantAuthGuard)
  async status(@ReqContext() ctx: RequestContext) {
    const [status, budget, coverage] = await Promise.all([
      this.ai.status(),
      this.ai.getBudget(ctx.tenantId),
      this.ai.highRiskApprovalCoverage(ctx.tenantId),
    ]);
    return { ...status, budget, high_risk_coverage: coverage };
  }

  @Get('v1/admin/ai/budget')
  @UseGuards(TenantAuthGuard)
  budget(@ReqContext() ctx: RequestContext) {
    return this.ai.getBudget(ctx.tenantId);
  }

  @Post('v1/admin/ai/actions')
  @UseGuards(TenantAuthGuard)
  create(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        storefront_id: z.string().optional(),
        kind: z.enum(['theme_match_explain', 'headline_variants', 'shopping_qa']),
        payload: z.record(z.unknown()).default({}),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid AI action', parsed.error.flatten());
    return this.ai.createAction(
      ctx.tenantId,
      {
        storefrontId: parsed.data.storefront_id,
        kind: parsed.data.kind,
        payload: parsed.data.payload,
      },
      ctx.actorId,
    );
  }

  @Get('v1/admin/ai/actions')
  @UseGuards(TenantAuthGuard)
  list(@ReqContext() ctx: RequestContext, @Query('storefront_id') storefrontId?: string) {
    return this.ai.listActions(ctx.tenantId, storefrontId);
  }

  @Post('v1/admin/ai/actions/:id/review')
  @UseGuards(TenantAuthGuard)
  review(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        decision: z.enum(['approved', 'rejected']),
        note: z.string().min(3),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid review', parsed.error.flatten());
    return this.ai.reviewAction(
      ctx.tenantId,
      id,
      parsed.data.decision,
      parsed.data.note,
      ctx.actorId || 'admin',
    );
  }

  @Post('v1/admin/ai/actions/:id/apply')
  @UseGuards(TenantAuthGuard)
  apply(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.ai.applyAction(ctx.tenantId, id, ctx.actorId || 'admin');
  }
}
