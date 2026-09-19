import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { HrIamService } from './hr-iam.service';
import { HrEmployeeService } from './hr-employee.service';
import { HrSessionService } from './hr-session.service';
import { HrShiftService } from './hr-shift.service';
import { HrRoleService } from './hr-role.service';

const scopeSchema = z
  .object({
    type: z.enum(['tenant', 'brand', 'store', 'warehouse', 'channel']).default('tenant'),
    ids: z.array(z.string()).optional(),
  })
  .optional();

@Controller()
export class HrController {
  constructor(
    private readonly iam: HrIamService,
    private readonly employees: HrEmployeeService,
    private readonly sessions: HrSessionService,
    private readonly shifts: HrShiftService,
    private readonly roles: HrRoleService,
  ) {}

  @Get('v1/admin/hr/catalog')
  @UseGuards(TenantAuthGuard)
  catalog(@ReqContext() ctx: RequestContext) {
    return this.iam.catalog(ctx);
  }

  @Get('v1/admin/hr/roles')
  @UseGuards(TenantAuthGuard)
  listCustomRoles(@ReqContext() ctx: RequestContext) {
    return this.roles.listCustom(ctx);
  }

  @Post('v1/admin/hr/roles')
  @UseGuards(TenantAuthGuard)
  createRole(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        code: z.string().min(2),
        name: z.string().min(1),
        description: z.string().optional(),
        permissions: z.array(z.string()).min(1),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid role', parsed.error.flatten());
    return this.roles.create(ctx, parsed.data);
  }

  @Patch('v1/admin/hr/roles/:id')
  @UseGuards(TenantAuthGuard)
  updateRole(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        permissions: z.array(z.string()).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid role patch', parsed.error.flatten());
    return this.roles.update(ctx, id, parsed.data);
  }

  @Delete('v1/admin/hr/roles/:id')
  @UseGuards(TenantAuthGuard)
  deleteRole(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.roles.remove(ctx, id);
  }

  @Get('v1/admin/hr/me')
  @UseGuards(TenantAuthGuard)
  hrMe(@ReqContext() ctx: RequestContext) {
    return this.iam.me(ctx);
  }

  @Get('v1/admin/hr/users')
  @UseGuards(TenantAuthGuard)
  listUsers(
    @ReqContext() ctx: RequestContext,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    return this.iam.listUsers(ctx, { q, status, role });
  }

  @Post('v1/admin/hr/users/export')
  @UseGuards(TenantAuthGuard)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="users.csv"')
  exportUsers(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z.object({ reason: z.string().min(5) }).safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid export', parsed.error.flatten());
    return this.iam.exportUsersCsv(ctx, parsed.data.reason);
  }

  @Get('v1/admin/hr/users/:id')
  @UseGuards(TenantAuthGuard)
  getUser(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.iam.getUser(ctx, id);
  }

  @Post('v1/admin/hr/users/invite')
  @UseGuards(TenantAuthGuard)
  invite(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        email: z.string().email(),
        name: z.string().optional(),
        role_codes: z.array(z.string()).min(1),
        scope: scopeSchema,
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid invite', parsed.error.flatten());
    return this.iam.invite(ctx, parsed.data);
  }

  @Post('v1/admin/hr/users/:id/suspend')
  @UseGuards(TenantAuthGuard)
  suspend(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.iam.suspend(ctx, id);
  }

  @Post('v1/admin/hr/users/:id/reactivate')
  @UseGuards(TenantAuthGuard)
  reactivate(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.iam.reactivate(ctx, id);
  }

  @Post('v1/admin/hr/users/:id/roles')
  @UseGuards(TenantAuthGuard)
  assignRoles(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        role_codes: z.array(z.string()).min(1),
        scope: scopeSchema,
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid roles', parsed.error.flatten());
    return this.iam.assignRoles(ctx, id, parsed.data);
  }

  @Get('v1/admin/hr/users/:id/sessions')
  @UseGuards(TenantAuthGuard)
  listUserSessions(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.sessions.listForUser(ctx, id);
  }

  @Post('v1/admin/hr/users/:id/mfa/enroll')
  @UseGuards(TenantAuthGuard)
  enrollMfa(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.iam.enrollMfa(ctx, id);
  }

  @Post('v1/admin/hr/users/:id/mfa/verify')
  @UseGuards(TenantAuthGuard)
  verifyMfa(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({ code: z.string().min(4) }).safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid MFA verify', parsed.error.flatten());
    return this.iam.verifyMfa(ctx, id, parsed.data.code);
  }

  @Post('v1/admin/hr/users/:id/mfa/disable')
  @UseGuards(TenantAuthGuard)
  disableMfa(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.iam.disableMfa(ctx, id);
  }

  @Post('v1/admin/hr/sessions/:id/revoke')
  @UseGuards(TenantAuthGuard)
  revokeSession(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.sessions.revoke(ctx, id);
  }

  @Get('v1/admin/hr/login-events')
  @UseGuards(TenantAuthGuard)
  loginEvents(
    @ReqContext() ctx: RequestContext,
    @Query('user_id') userId?: string,
    @Query('email') email?: string,
    @Query('success') success?: string,
  ) {
    return this.sessions.listLoginEvents(ctx, {
      user_id: userId,
      email,
      success: success === undefined ? undefined : success === 'true' || success === '1',
    });
  }

  @Get('v1/admin/hr/employees')
  @UseGuards(TenantAuthGuard)
  listEmployees(
    @ReqContext() ctx: RequestContext,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
  ) {
    return this.employees.list(ctx, { q, status, department });
  }

  @Post('v1/admin/hr/employees')
  @UseGuards(TenantAuthGuard)
  createEmployee(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        code: z.string().min(1),
        display_name: z.string().min(1),
        title: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        department: z.string().optional(),
        status: z.string().optional(),
        store_ids: z.array(z.string()).optional(),
        primary_store_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid employee', parsed.error.flatten());
    return this.employees.create(ctx, parsed.data);
  }

  @Get('v1/admin/hr/employees/:id')
  @UseGuards(TenantAuthGuard)
  getEmployee(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.employees.get(ctx, id);
  }

  @Patch('v1/admin/hr/employees/:id')
  @UseGuards(TenantAuthGuard)
  updateEmployee(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        display_name: z.string().optional(),
        title: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        department: z.string().optional(),
        status: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid employee patch', parsed.error.flatten());
    return this.employees.update(ctx, id, parsed.data);
  }

  @Post('v1/admin/hr/employees/:id/pos-pin')
  @UseGuards(TenantAuthGuard)
  setPosPin(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({ pin: z.string().min(4).max(8) }).safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid PIN', parsed.error.flatten());
    return this.employees.setPosPin(ctx, id, parsed.data.pin);
  }

  @Post('v1/admin/hr/employees/:id/pos-pin/verify')
  @UseGuards(TenantAuthGuard)
  verifyPosPin(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({ pin: z.string().min(4).max(8) }).safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid PIN', parsed.error.flatten());
    return this.employees.verifyPosPin(ctx, id, parsed.data.pin);
  }

  @Post('v1/admin/hr/employees/:id/link-user')
  @UseGuards(TenantAuthGuard)
  linkUser(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({ user_id: z.string().nullable() })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid link', parsed.error.flatten());
    return this.employees.linkUser(ctx, id, parsed.data.user_id);
  }

  @Post('v1/admin/hr/employees/:id/stores')
  @UseGuards(TenantAuthGuard)
  setStores(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        store_ids: z.array(z.string()).min(1),
        primary_store_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid stores', parsed.error.flatten());
    return this.employees.setStoreAssignments(ctx, id, parsed.data);
  }

  @Get('v1/admin/hr/shifts')
  @UseGuards(TenantAuthGuard)
  listShifts(
    @ReqContext() ctx: RequestContext,
    @Query('status') status?: string,
    @Query('register_id') registerId?: string,
  ) {
    return this.shifts.list(ctx, { status, register_id: registerId });
  }

  @Get('v1/admin/hr/pos-locations')
  @UseGuards(TenantAuthGuard)
  posLocations(@ReqContext() ctx: RequestContext) {
    return this.shifts.listRegisters(ctx);
  }

  @Post('v1/admin/hr/shifts/open')
  @UseGuards(TenantAuthGuard)
  openShift(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        register_id: z.string().min(1),
        opening_cash: z.number().optional(),
        employee_id: z.string().optional(),
        note: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid open shift', parsed.error.flatten());
    return this.shifts.open(ctx, parsed.data);
  }

  @Post('v1/admin/hr/shifts/:id/close')
  @UseGuards(TenantAuthGuard)
  closeShift(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        closing_cash: z.number(),
        note: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid close shift', parsed.error.flatten());
    return this.shifts.close(ctx, id, parsed.data);
  }
}

@Controller()
export class HrPublicController {
  constructor(private readonly iam: HrIamService) {}

  @Get('v1/public/invites/:token')
  preview(@Param('token') token: string) {
    return this.iam.previewInvite(token);
  }

  @Post('v1/public/invites/:token/accept')
  accept(@Param('token') token: string, @Body() body: unknown) {
    const parsed = z
      .object({
        password: z.string().min(8),
        name: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid accept', parsed.error.flatten());
    return this.iam.acceptInvite(token, parsed.data);
  }
}
