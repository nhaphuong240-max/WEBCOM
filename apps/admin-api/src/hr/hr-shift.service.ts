import { Injectable } from '@nestjs/common';
import { AppError } from '@ptt/shared-kernel';
import type { RequestContext } from '@ptt/shared-kernel';
import { PosService } from '../pos/pos.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission, hrFeature } from './hr-access';

function requireHrShift() {
  if (!hrFeature('hr.shift', false)) {
    throw AppError.validation('Feature hr.shift disabled');
  }
}

@Injectable()
export class HrShiftService {
  constructor(
    private readonly pos: PosService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ctx: RequestContext, query?: { status?: string; register_id?: string }) {
    requireHrShift();
    await assertPermission(this.prisma, ctx, 'pos.shift.manage');
    const rows = await this.prisma.db.posShift.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(query?.status ? { status: query.status } : {}),
        ...(query?.register_id ? { registerId: query.register_id } : {}),
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
      include: { register: true, location: true },
    });
    return rows.map((s) => ({
      id: s.id,
      status: s.status,
      location_id: s.locationId,
      location_name: s.location.name,
      register_id: s.registerId,
      register_code: s.register.code,
      cashier_id: s.cashierId,
      opening_cash: Number(s.openingCash),
      closing_cash: s.closingCash != null ? Number(s.closingCash) : null,
      cash_variance: s.cashVariance != null ? Number(s.cashVariance) : null,
      opened_at: s.openedAt.toISOString(),
      closed_at: s.closedAt?.toISOString() ?? null,
      note: s.note,
    }));
  }

  async open(
    ctx: RequestContext,
    input: { register_id: string; opening_cash?: number; employee_id?: string; note?: string },
  ) {
    requireHrShift();
    await assertPermission(this.prisma, ctx, 'pos.shift.manage');
    let cashierId = ctx.actorId;
    if (input.employee_id) {
      const emp = await this.prisma.db.employee.findFirst({
        where: { id: input.employee_id, tenantId: ctx.tenantId },
      });
      if (!emp) throw AppError.notFound('Employee not found');
      cashierId = emp.userId || emp.id;
    }
    const shift = await this.pos.openShift(
      ctx.tenantId,
      {
        register_id: input.register_id,
        opening_cash: input.opening_cash,
        cashier_id: cashierId,
        note: input.note,
      },
      ctx.actorId,
    );
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.shift.open',
      entity: 'pos_shift',
      entityId: shift.id,
      payload: { register_id: input.register_id, employee_id: input.employee_id || null },
    });
    return shift;
  }

  async close(
    ctx: RequestContext,
    shiftId: string,
    input: { closing_cash: number; note?: string },
  ) {
    requireHrShift();
    await assertPermission(this.prisma, ctx, 'pos.shift.manage');
    return this.pos.closeShift(ctx.tenantId, shiftId, input, ctx.actorId);
  }

  async listRegisters(ctx: RequestContext) {
    requireHrShift();
    await assertPermission(this.prisma, ctx, 'pos.shift.manage');
    return this.pos.listLocations(ctx.tenantId);
  }
}
