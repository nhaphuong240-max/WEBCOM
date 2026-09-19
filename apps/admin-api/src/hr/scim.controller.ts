import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { HrIamService } from './hr-iam.service';

/**
 * HR-3 SCIM stub — minimal Users list + create→invite.
 * Full IdP sync = HRM-Pro / future. Not a complete SCIM 2.0 server.
 */
@Controller('scim/v2')
export class ScimController {
  constructor(private readonly iam: HrIamService) {}

  @Get('Users')
  @UseGuards(TenantAuthGuard)
  async listUsers(
    @ReqContext() ctx: RequestContext,
    @Query('filter') _filter?: string,
    @Query('startIndex') startIndex?: string,
    @Query('count') count?: string,
  ) {
    const users = await this.iam.listUsers(ctx);
    const start = Math.max(1, Number(startIndex) || 1);
    const take = Math.min(100, Math.max(1, Number(count) || 50));
    const slice = users.slice(start - 1, start - 1 + take);
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: users.length,
      startIndex: start,
      itemsPerPage: slice.length,
      Resources: slice.map((u) => this.toScim(u)),
      meta: { stub: true, note: 'HR-3 SCIM stub — not a full IdP sync' },
    };
  }

  @Post('Users')
  @UseGuards(TenantAuthGuard)
  async createUser(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        userName: z.string().email().optional(),
        emails: z
          .array(z.object({ value: z.string().email(), primary: z.boolean().optional() }))
          .optional(),
        displayName: z.string().optional(),
        name: z
          .object({ formatted: z.string().optional(), givenName: z.string().optional() })
          .optional(),
        roles: z.array(z.object({ value: z.string() })).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid SCIM User', parsed.error.flatten());

    const email =
      parsed.data.userName ||
      parsed.data.emails?.find((e) => e.primary)?.value ||
      parsed.data.emails?.[0]?.value;
    if (!email) throw AppError.validation('userName or emails[0].value required');

    const roleCodes = parsed.data.roles?.map((r) => r.value).filter(Boolean);
    const invite = await this.iam.invite(ctx, {
      email,
      name:
        parsed.data.displayName ||
        parsed.data.name?.formatted ||
        parsed.data.name?.givenName ||
        undefined,
      role_codes: roleCodes?.length ? roleCodes : ['readonly'],
      scope: { type: 'tenant' },
    });

    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: invite.user_id,
      userName: email,
      active: false,
      meta: {
        resourceType: 'User',
        stub: true,
        invite_token: invite.invite_token,
        invite_url: invite.accept_url,
        note: 'Created as pending invite — accept via /v1/public/invites/:token/accept',
      },
    };
  }

  private toScim(u: {
    id: string;
    email: string;
    name: string;
    status: string;
    roles: string[];
  }) {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: u.id,
      userName: u.email,
      displayName: u.name,
      active: u.status === 'active',
      emails: [{ value: u.email, primary: true }],
      roles: u.roles.map((value) => ({ value })),
    };
  }
}
