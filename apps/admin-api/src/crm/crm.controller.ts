import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { CrmService } from './crm.service';
import { CrmIdentityService } from './crm-identity.service';
import { CrmRfmService } from './crm-rfm.service';
import { CrmSegmentService } from './crm-segment.service';

const addressSchema = z.object({
  label: z.string().optional(),
  line1: z.string().min(1),
  city: z.string().optional(),
  phone: z.string().optional(),
  is_default: z.boolean().optional(),
});

const ruleSchema = z.object({
  field: z.string().min(1),
  op: z.string().min(1),
  value: z.unknown().optional(),
  window_days: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().optional(),
});

@Controller()
@UseGuards(TenantAuthGuard)
export class CrmController {
  constructor(
    private readonly crm: CrmService,
    private readonly identity: CrmIdentityService,
    private readonly rfm: CrmRfmService,
    private readonly segments: CrmSegmentService,
  ) {}

  @Get('v1/admin/crm/status')
  status() {
    return this.crm.status();
  }

  @Post('v1/admin/customers/ensure')
  ensure(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        phone: z.string().optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
        consent_marketing: z.boolean().optional(),
        consent_email: z.boolean().optional(),
        consent_sms: z.boolean().optional(),
        consent_zns: z.boolean().optional(),
        consent_messenger: z.boolean().optional(),
        addresses: z.array(addressSchema).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid ensure', parsed.error.flatten());
    return this.crm.ensure(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/customers')
  list(
    @ReqContext() ctx: RequestContext,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('include_merged') includeMerged?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crm.list(ctx.tenantId, {
      q,
      status,
      include_merged: includeMerged === '1' || includeMerged === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('v1/admin/customers/:id')
  get(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.crm.get360(ctx.tenantId, id);
  }

  @Patch('v1/admin/customers/:id')
  update(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        name: z.string().optional(),
        email: z.string().email().nullable().optional(),
        phone: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
        addresses: z.array(addressSchema).optional(),
        status: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid update', parsed.error.flatten());
    return this.crm.updateProfile(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Patch('v1/admin/customers/:id/consent')
  consent(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        consent_marketing: z.boolean().optional(),
        consent_email: z.boolean().optional(),
        consent_sms: z.boolean().optional(),
        consent_zns: z.boolean().optional(),
        consent_messenger: z.boolean().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid consent', parsed.error.flatten());
    return this.crm.updateConsent(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/customers/:id/link-inbox')
  linkInbox(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.crm.get360(ctx.tenantId, id).then(async (detail) => {
      const linked = await this.crm.linkInboxByPhone(ctx.tenantId, id, detail.phone);
      const refreshed = await this.crm.get360(ctx.tenantId, id);
      return { ...linked, customer: refreshed };
    });
  }

  @Get('v1/admin/customers/:id/identities')
  listIdentities(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.identity.listIdentities(ctx.tenantId, id);
  }

  @Post('v1/admin/customers/:id/identities')
  addIdentity(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        type: z.string().min(1),
        value: z.string().min(1),
        verified: z.boolean().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid identity', parsed.error.flatten());
    return this.identity.addIdentity(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Delete('v1/admin/customers/:id/identities/:identityId')
  removeIdentity(@ReqContext() ctx: RequestContext, @Param('identityId') identityId: string) {
    return this.identity.removeIdentity(ctx.tenantId, identityId, ctx.actorId);
  }

  @Post('v1/admin/crm/matches/scan')
  scanMatches(@ReqContext() ctx: RequestContext) {
    return this.identity.scanMatches(ctx.tenantId);
  }

  @Get('v1/admin/crm/matches')
  listMatches(
    @ReqContext() ctx: RequestContext,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.identity.listMatches(
      ctx.tenantId,
      status ?? 'pending',
      limit ? Number(limit) : 50,
    );
  }

  @Post('v1/admin/crm/matches/:id/dismiss')
  dismissMatch(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.identity.dismissMatch(ctx.tenantId, id, ctx.actorId);
  }

  @Post('v1/admin/crm/merge')
  merge(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        survivor_id: z.string().min(1),
        merged_id: z.string().min(1),
        reason: z.string().optional(),
        match_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid merge', parsed.error.flatten());
    return this.identity.merge(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/crm/merge/:eventId/unmerge')
  unmerge(@ReqContext() ctx: RequestContext, @Param('eventId') eventId: string) {
    return this.identity.unmerge(ctx.tenantId, eventId, ctx.actorId);
  }

  @Get('v1/admin/crm/merge-events')
  listMergeEvents(@ReqContext() ctx: RequestContext, @Query('limit') limit?: string) {
    return this.identity.listMergeEvents(ctx.tenantId, limit ? Number(limit) : 50);
  }

  @Post('v1/admin/crm/rfm/refresh')
  rfmRefresh(@ReqContext() ctx: RequestContext) {
    return this.rfm.refresh(ctx.tenantId, ctx.actorId);
  }

  @Get('v1/admin/crm/rfm/summary')
  rfmSummary(@ReqContext() ctx: RequestContext) {
    return this.rfm.summary(ctx.tenantId);
  }

  @Get('v1/admin/crm/rfm/customers')
  rfmCustomers(
    @ReqContext() ctx: RequestContext,
    @Query('segment') segment?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rfm.listBySegment(ctx.tenantId, segment, limit ? Number(limit) : 50);
  }

  @Get('v1/admin/crm/rfm/jobs')
  rfmJobs(@ReqContext() ctx: RequestContext, @Query('limit') limit?: string) {
    return this.rfm.listJobs(ctx.tenantId, limit ? Number(limit) : 20);
  }

  @Get('v1/admin/segments')
  listSegments(@ReqContext() ctx: RequestContext) {
    return this.segments.list(ctx.tenantId);
  }

  @Post('v1/admin/segments')
  createSegment(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        logic: z.enum(['AND', 'OR', 'and', 'or']).optional(),
        status: z.string().optional(),
        rules: z.array(ruleSchema).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid segment', parsed.error.flatten());
    return this.segments.create(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/segments/:id')
  getSegment(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.segments.get(ctx.tenantId, id);
  }

  @Patch('v1/admin/segments/:id')
  updateSegment(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        logic: z.enum(['AND', 'OR', 'and', 'or']).optional(),
        status: z.string().optional(),
        rules: z.array(ruleSchema).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid segment update', parsed.error.flatten());
    return this.segments.update(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Delete('v1/admin/segments/:id')
  deleteSegment(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.segments.remove(ctx.tenantId, id, ctx.actorId);
  }

  @Post('v1/admin/segments/:id/preview')
  previewSegment(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Query('sample_limit') sampleLimit?: string,
  ) {
    return this.segments.preview(ctx.tenantId, id, sampleLimit ? Number(sampleLimit) : 20);
  }

  @Post('v1/admin/segments/:id/materialize')
  materializeSegment(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.segments.materialize(ctx.tenantId, id, ctx.actorId);
  }

  @Get('v1/admin/segments/:id/members')
  segmentMembers(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.segments.listMembers(ctx.tenantId, id, limit ? Number(limit) : 50);
  }
}
