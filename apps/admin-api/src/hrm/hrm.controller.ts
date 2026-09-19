import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { HrmOrgService } from './hrm-org.service';
import { HrmContractService } from './hrm-contract.service';
import { HrmLeaveService } from './hrm-leave.service';
import { HrmAttendanceService } from './hrm-attendance.service';
import { HrmPayrollService } from './hrm-payroll.service';

@Controller()
@UseGuards(TenantAuthGuard)
export class HrmController {
  constructor(
    private readonly org: HrmOrgService,
    private readonly contracts: HrmContractService,
    private readonly leave: HrmLeaveService,
    private readonly attendance: HrmAttendanceService,
    private readonly payroll: HrmPayrollService,
  ) {}

  @Get('v1/admin/hrm/legal-entities')
  listLegalEntities(@ReqContext() ctx: RequestContext) {
    return this.org.listLegalEntities(ctx);
  }

  @Post('v1/admin/hrm/legal-entities')
  createLegalEntity(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        code: z.string().min(1),
        name: z.string().min(1),
        tax_code: z.string().optional(),
        status: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid legal entity', parsed.error.flatten());
    return this.org.createLegalEntity(ctx, parsed.data);
  }

  @Get('v1/admin/hrm/departments')
  listDepartments(@ReqContext() ctx: RequestContext) {
    return this.org.listDepartments(ctx);
  }

  @Post('v1/admin/hrm/departments')
  createDepartment(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        code: z.string().min(1),
        name: z.string().min(1),
        legal_entity_id: z.string().optional(),
        parent_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid department', parsed.error.flatten());
    return this.org.createDepartment(ctx, parsed.data);
  }

  @Patch('v1/admin/hrm/employees/:id/org')
  patchEmployeeOrg(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        department_id: z.string().nullable().optional(),
        reports_to_id: z.string().nullable().optional(),
        legal_entity_id: z.string().nullable().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid org patch', parsed.error.flatten());
    return this.org.patchEmployeeOrg(ctx, id, parsed.data);
  }

  @Get('v1/admin/hrm/contracts')
  listContracts(
    @ReqContext() ctx: RequestContext,
    @Query('employee_id') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.contracts.list(ctx, { employee_id: employeeId, status });
  }

  @Post('v1/admin/hrm/contracts')
  createContract(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        employee_id: z.string().min(1),
        contract_type: z.enum(['probation', 'fixed', 'indefinite']),
        start_date: z.string().min(1),
        end_date: z.string().optional(),
        base_salary: z.number().positive(),
        currency: z.string().optional(),
        document_url: z.string().optional(),
        note: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid contract', parsed.error.flatten());
    return this.contracts.create(ctx, parsed.data);
  }

  @Patch('v1/admin/hrm/contracts/:id')
  updateContract(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        contract_type: z.enum(['probation', 'fixed', 'indefinite']).optional(),
        start_date: z.string().optional(),
        end_date: z.string().nullable().optional(),
        base_salary: z.number().positive().optional(),
        currency: z.string().optional(),
        document_url: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid contract patch', parsed.error.flatten());
    return this.contracts.update(ctx, id, parsed.data);
  }

  @Post('v1/admin/hrm/contracts/:id/activate')
  activateContract(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.contracts.activate(ctx, id);
  }

  @Get('v1/admin/hrm/leave/policies')
  listLeavePolicies(@ReqContext() ctx: RequestContext) {
    return this.leave.listPolicies(ctx);
  }

  @Post('v1/admin/hrm/leave/policies')
  createLeavePolicy(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        leave_type: z.string().min(1),
        name: z.string().min(1),
        days_per_year: z.number().int().min(0),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid leave policy', parsed.error.flatten());
    return this.leave.createPolicy(ctx, parsed.data);
  }

  @Get('v1/admin/hrm/leave/balances')
  listLeaveBalances(
    @ReqContext() ctx: RequestContext,
    @Query('employee_id') employeeId: string,
    @Query('year') year?: string,
  ) {
    if (!employeeId) throw AppError.validation('employee_id required');
    return this.leave.listBalances(ctx, employeeId, year ? Number(year) : undefined);
  }

  @Get('v1/admin/hrm/leave/requests')
  listLeaveRequests(
    @ReqContext() ctx: RequestContext,
    @Query('employee_id') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.leave.listRequests(ctx, { employee_id: employeeId, status });
  }

  @Post('v1/admin/hrm/leave/requests')
  createLeaveRequest(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        employee_id: z.string().min(1),
        leave_type: z.string().min(1),
        start_date: z.string().min(1),
        end_date: z.string().min(1),
        reason: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid leave request', parsed.error.flatten());
    return this.leave.createRequest(ctx, parsed.data);
  }

  @Post('v1/admin/hrm/leave/requests/:id/approve')
  approveLeave(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({ reviewer_note: z.string().optional() }).safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid approve body', parsed.error.flatten());
    return this.leave.approve(ctx, id, parsed.data.reviewer_note);
  }

  @Post('v1/admin/hrm/leave/requests/:id/reject')
  rejectLeave(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({ reviewer_note: z.string().optional() }).safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid reject body', parsed.error.flatten());
    return this.leave.reject(ctx, id, parsed.data.reviewer_note);
  }

  @Get('v1/admin/hrm/schedules')
  listSchedules(@ReqContext() ctx: RequestContext) {
    return this.attendance.listSchedules(ctx);
  }

  @Post('v1/admin/hrm/schedules')
  createSchedule(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        code: z.string().min(1),
        name: z.string().min(1),
        pattern: z.record(z.unknown()).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid schedule', parsed.error.flatten());
    return this.attendance.createSchedule(ctx, parsed.data);
  }

  @Get('v1/admin/hrm/roster')
  listRoster(
    @ReqContext() ctx: RequestContext,
    @Query('employee_id') employeeId?: string,
    @Query('store_id') storeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendance.listRoster(ctx, {
      employee_id: employeeId,
      store_id: storeId,
      from,
      to,
    });
  }

  @Post('v1/admin/hrm/roster')
  createRoster(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        employee_id: z.string().min(1),
        store_id: z.string().min(1),
        work_date: z.string().min(1),
        schedule_id: z.string().optional(),
        planned_start: z.string().optional(),
        planned_end: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid roster entry', parsed.error.flatten());
    return this.attendance.createRoster(ctx, parsed.data);
  }

  @Post('v1/admin/hrm/attendance/check')
  checkAttendance(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        employee_id: z.string().min(1),
        event_type: z.enum(['check_in', 'check_out']),
        store_id: z.string().optional(),
        occurred_at: z.string().optional(),
        source: z.enum(['manual', 'qr', 'csv', 'pos_shift']).optional(),
        note: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid check', parsed.error.flatten());
    return this.attendance.check(ctx, parsed.data);
  }

  @Get('v1/admin/hrm/attendance/events')
  listAttendanceEvents(@ReqContext() ctx: RequestContext, @Query('limit') limit?: string) {
    return this.attendance.listEvents(ctx, limit ? Number(limit) : 50);
  }

  @Get('v1/admin/hrm/timesheets')
  listTimesheetPeriods(@ReqContext() ctx: RequestContext) {
    return this.attendance.listTimesheetPeriods(ctx);
  }

  @Post('v1/admin/hrm/timesheets/:year/:month/build')
  buildTimesheet(
    @ReqContext() ctx: RequestContext,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.attendance.buildTimesheet(ctx, Number(year), Number(month));
  }

  @Post('v1/admin/hrm/timesheets/:year/:month/lock')
  lockTimesheet(
    @ReqContext() ctx: RequestContext,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.attendance.lockTimesheet(ctx, Number(year), Number(month));
  }

  @Get('v1/admin/hrm/timesheets/:year/:month')
  getTimesheet(
    @ReqContext() ctx: RequestContext,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.attendance.getTimesheet(ctx, Number(year), Number(month));
  }

  @Put('v1/admin/hrm/salary/:employeeId')
  upsertSalary(
    @ReqContext() ctx: RequestContext,
    @Param('employeeId') employeeId: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        base_salary: z.number().positive(),
        allowances: z.record(z.number()).optional(),
        effective_from: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid salary', parsed.error.flatten());
    return this.payroll.upsertSalary(ctx, employeeId, parsed.data);
  }

  @Post('v1/admin/hrm/payroll/:year/:month/run')
  createPayrollRun(
    @ReqContext() ctx: RequestContext,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.payroll.createRun(ctx, Number(year), Number(month));
  }

  @Post('v1/admin/hrm/payroll/runs/:id/transition')
  transitionPayrollRun(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({ status: z.enum(['draft', 'review', 'approved', 'paid']) })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid transition', parsed.error.flatten());
    return this.payroll.transitionRun(ctx, id, parsed.data.status);
  }

  @Get('v1/admin/hrm/payroll/runs')
  listPayrollRuns(@ReqContext() ctx: RequestContext) {
    return this.payroll.listRuns(ctx);
  }

  @Get('v1/admin/hrm/payroll/runs/:id/payslips')
  listPayslips(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.payroll.listPayslips(ctx, id);
  }

  @Get('v1/me/hrm/payslips')
  myPayslips(@ReqContext() ctx: RequestContext) {
    return this.payroll.myPayslips(ctx);
  }

  @Get('v1/me/hrm/leave')
  myLeave(@ReqContext() ctx: RequestContext) {
    return this.leave.myLeave(ctx);
  }
}
