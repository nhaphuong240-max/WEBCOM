import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import type { RequestContext } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission, requireHrmPro } from './hrm-access';
import { parseDateOnly, toDec } from './hrm-utils';

@Injectable()
export class HrmAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listSchedules(ctx: RequestContext) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.attendance.read');
    return this.prisma.db.workSchedule.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { code: 'asc' },
    });
  }

  async createSchedule(
    ctx: RequestContext,
    input: { code: string; name: string; pattern?: Record<string, unknown> },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.attendance.manage');
    const id = createId('wsc');
    return this.prisma.db.workSchedule.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        pattern: (input.pattern ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async listRoster(
    ctx: RequestContext,
    query?: { employee_id?: string; store_id?: string; from?: string; to?: string },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.attendance.read');
    const where: Record<string, unknown> = { tenantId: ctx.tenantId };
    if (query?.employee_id) where.employeeId = query.employee_id;
    if (query?.store_id) where.storeId = query.store_id;
    if (query?.from || query?.to) {
      where.workDate = {
        ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
        ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
      };
    }
    return this.prisma.db.rosterEntry.findMany({
      where,
      orderBy: { workDate: 'asc' },
      take: 500,
    });
  }

  async createRoster(
    ctx: RequestContext,
    input: {
      employee_id: string;
      store_id: string;
      work_date: string;
      schedule_id?: string;
      planned_start?: string;
      planned_end?: string;
    },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.attendance.manage');
    const id = createId('rst');
    const row = await this.prisma.db.rosterEntry.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        employeeId: input.employee_id,
        storeId: input.store_id,
        workDate: parseDateOnly(input.work_date),
        scheduleId: input.schedule_id || null,
        plannedStart: input.planned_start || null,
        plannedEnd: input.planned_end || null,
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'create',
      entity: 'roster_entry',
      entityId: id,
    });
    return row;
  }

  async check(
    ctx: RequestContext,
    input: {
      employee_id: string;
      event_type: 'check_in' | 'check_out';
      store_id?: string;
      occurred_at?: string;
      source?: string;
      note?: string;
    },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.attendance.manage');
    const id = createId('att');
    const row = await this.prisma.db.attendanceEvent.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        employeeId: input.employee_id,
        storeId: input.store_id || null,
        eventType: input.event_type,
        occurredAt: input.occurred_at ? new Date(input.occurred_at) : new Date(),
        source: input.source || 'manual',
        note: input.note || null,
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'check',
      entity: 'attendance_event',
      entityId: id,
    });
    return row;
  }

  async listEvents(ctx: RequestContext, limit = 50) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.attendance.read');
    return this.prisma.db.attendanceEvent.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { occurredAt: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
    });
  }

  async listTimesheetPeriods(ctx: RequestContext) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.attendance.read');
    return this.prisma.db.timesheetPeriod.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 24,
      include: { _count: { select: { lines: true } } },
    });
  }

  /** Stub — accepts CSV rows but only logs count. */
  async importStub(ctx: RequestContext, rows: unknown[]) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.attendance.manage');
    return { imported: 0, received: rows.length, status: 'stub' };
  }

  async getTimesheet(ctx: RequestContext, year: number, month: number) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.attendance.read');
    const period = await this.prisma.db.timesheetPeriod.findUnique({
      where: { tenantId_year_month: { tenantId: ctx.tenantId, year, month } },
      include: { lines: { include: { employee: { select: { id: true, code: true, displayName: true } } } } },
    });
    return period ?? { status: 'missing', year, month, lines: [] };
  }

  async buildTimesheet(ctx: RequestContext, year: number, month: number) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.attendance.manage');
    const period = await this.ensurePeriod(ctx.tenantId, year, month);
    if (period.status === 'locked' || period.status === 'approved') {
      throw AppError.validation('Timesheet period is locked');
    }

    const rangeStart = new Date(Date.UTC(year, month - 1, 1));
    const rangeEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const employees = await this.prisma.db.employee.findMany({
      where: { tenantId: ctx.tenantId, status: 'active' },
      select: { id: true },
    });

    for (const emp of employees) {
      const hours = await this.computeHours(ctx.tenantId, emp.id, rangeStart, rangeEnd);
      const workDays = Math.min(hours / 8, 26);
      await this.prisma.db.timesheetLine.upsert({
        where: { periodId_employeeId: { periodId: period.id, employeeId: emp.id } },
        create: {
          id: createId('tsl'),
          tenantId: ctx.tenantId,
          periodId: period.id,
          employeeId: emp.id,
          workDays: toDec(workDays),
          workHours: toDec(hours),
        },
        update: {
          workDays: toDec(workDays),
          workHours: toDec(hours),
        },
      });
    }

    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'build',
      entity: 'timesheet_period',
      entityId: period.id,
      payload: { year, month },
    });

    return this.getTimesheet(ctx, year, month);
  }

  async lockTimesheet(ctx: RequestContext, year: number, month: number) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.timesheet.lock');
    const period = await this.ensurePeriod(ctx.tenantId, year, month);
    if (period.status === 'locked' || period.status === 'approved') return period;
    const row = await this.prisma.db.timesheetPeriod.update({
      where: { id: period.id },
      data: { status: 'locked', lockedAt: new Date() },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'lock',
      entity: 'timesheet_period',
      entityId: period.id,
    });
    return row;
  }

  private async ensurePeriod(tenantId: string, year: number, month: number) {
    const existing = await this.prisma.db.timesheetPeriod.findUnique({
      where: { tenantId_year_month: { tenantId, year, month } },
    });
    if (existing) return existing;
    return this.prisma.db.timesheetPeriod.create({
      data: {
        id: createId('tsp'),
        tenantId,
        year,
        month,
        status: 'open',
      },
    });
  }

  private async computeHours(
    tenantId: string,
    employeeId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<number> {
    const events = await this.prisma.db.attendanceEvent.findMany({
      where: {
        tenantId,
        employeeId,
        occurredAt: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: { occurredAt: 'asc' },
    });

    let hours = 0;
    let checkIn: Date | null = null;
    for (const ev of events) {
      if (ev.eventType === 'check_in') {
        checkIn = ev.occurredAt;
      } else if (ev.eventType === 'check_out' && checkIn) {
        hours += (ev.occurredAt.getTime() - checkIn.getTime()) / 3_600_000;
        checkIn = null;
      }
    }

    const emp = await this.prisma.db.employee.findUnique({ where: { id: employeeId } });
    if (emp?.userId) {
      hours += await this.posShiftHours(tenantId, emp.userId, rangeStart, rangeEnd);
    }

    return Math.round(hours * 100) / 100;
  }

  private async posShiftHours(
    tenantId: string,
    cashierId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<number> {
    const shifts = await this.prisma.db.posShift.findMany({
      where: {
        tenantId,
        cashierId,
        status: 'closed',
        openedAt: { gte: rangeStart, lte: rangeEnd },
        closedAt: { not: null },
      },
    });
    return shifts.reduce((sum, s) => {
      if (!s.closedAt) return sum;
      return sum + (s.closedAt.getTime() - s.openedAt.getTime()) / 3_600_000;
    }, 0);
  }
}
