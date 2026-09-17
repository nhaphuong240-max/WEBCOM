import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const FIELDS = new Set([
  'rfm_r',
  'rfm_f',
  'rfm_m',
  'rfm_score',
  'rfm_segment',
  'lifetime_orders',
  'lifetime_spend',
  'tags',
  'status',
  'consent_email',
  'consent_sms',
  'consent_zns',
  'consent_messenger',
  'consent_marketing',
  'last_order_days',
]);

const OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'has_tag']);

type RuleIn = {
  field: string;
  op: string;
  value?: unknown;
  window_days?: number | null;
  sort_order?: number;
};

type CustomerEval = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tags: string[];
  status: string;
  lifetimeOrders: number;
  lifetimeSpend: Prisma.Decimal;
  lastOrderAt: Date | null;
  rfmR: number | null;
  rfmF: number | null;
  rfmM: number | null;
  rfmScore: number | null;
  rfmSegment: string | null;
  consentEmail: boolean;
  consentSms: boolean;
  consentZns: boolean;
  consentMessenger: boolean;
  consentMarketing: boolean;
};

function fieldValue(c: CustomerEval, field: string, windowDays?: number | null): unknown {
  switch (field) {
    case 'rfm_r':
      return c.rfmR;
    case 'rfm_f':
      return c.rfmF;
    case 'rfm_m':
      return c.rfmM;
    case 'rfm_score':
      return c.rfmScore;
    case 'rfm_segment':
      return c.rfmSegment;
    case 'lifetime_orders':
      return c.lifetimeOrders;
    case 'lifetime_spend':
      return Number(c.lifetimeSpend);
    case 'tags':
      return c.tags;
    case 'status':
      return c.status;
    case 'consent_email':
      return c.consentEmail;
    case 'consent_sms':
      return c.consentSms;
    case 'consent_zns':
      return c.consentZns;
    case 'consent_messenger':
      return c.consentMessenger;
    case 'consent_marketing':
      return c.consentMarketing;
    case 'last_order_days': {
      if (!c.lastOrderAt) return 9999;
      const days = Math.floor((Date.now() - c.lastOrderAt.getTime()) / 86_400_000);
      if (windowDays != null) return days <= windowDays ? days : null;
      return days;
    }
    default:
      return null;
  }
}

function matchOp(actual: unknown, op: string, expected: unknown): boolean {
  if (op === 'has_tag') {
    const tags = Array.isArray(actual) ? (actual as string[]) : [];
    return tags.includes(String(expected));
  }
  if (op === 'contains') {
    if (Array.isArray(actual)) return actual.map(String).includes(String(expected));
    return String(actual ?? '')
      .toLowerCase()
      .includes(String(expected ?? '').toLowerCase());
  }
  if (op === 'in') {
    const list = Array.isArray(expected) ? expected : [expected];
    return list.map(String).includes(String(actual));
  }
  if (actual == null && expected != null && !['neq'].includes(op)) return false;

  const aNum = Number(actual);
  const eNum = Number(expected);
  const bothNum = !Number.isNaN(aNum) && !Number.isNaN(eNum) && actual !== '' && expected !== '';

  switch (op) {
    case 'eq':
      return bothNum ? aNum === eNum : String(actual) === String(expected);
    case 'neq':
      return bothNum ? aNum !== eNum : String(actual) !== String(expected);
    case 'gt':
      return bothNum && aNum > eNum;
    case 'gte':
      return bothNum && aNum >= eNum;
    case 'lt':
      return bothNum && aNum < eNum;
    case 'lte':
      return bothNum && aNum <= eNum;
    default:
      return false;
  }
}

@Injectable()
export class CrmSegmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string) {
    const rows = await this.prisma.db.segment.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      include: { rules: { orderBy: { sortOrder: 'asc' } } },
    });
    return rows.map((r) => this.mapSegment(r));
  }

  async get(tenantId: string, id: string) {
    const row = await this.requireSegment(tenantId, id);
    return this.mapSegment(row);
  }

  async create(
    tenantId: string,
    input: {
      name: string;
      description?: string;
      logic?: string;
      status?: string;
      rules?: RuleIn[];
    },
    actorId?: string,
  ) {
    const logic = (input.logic || 'AND').toUpperCase();
    if (logic !== 'AND' && logic !== 'OR') throw AppError.validation('logic must be AND|OR');
    const rules = (input.rules || []).map((r, i) => this.normalizeRule(r, i));

    try {
      const row = await this.prisma.db.segment.create({
        data: {
          id: createId('seg'),
          tenantId,
          name: input.name.trim(),
          description: input.description || '',
          logic,
          status: input.status || 'draft',
          rules: {
            create: rules.map((r) => ({
              id: createId('sgr'),
              tenantId,
              field: r.field,
              op: r.op,
              value: r.value as Prisma.InputJsonValue,
              windowDays: r.window_days ?? null,
              sortOrder: r.sort_order ?? 0,
            })),
          },
        },
        include: { rules: { orderBy: { sortOrder: 'asc' } } },
      });
      await this.audit.write({
        tenantId,
        actorId,
        action: 'crm.segment_create',
        entity: 'segment',
        entityId: row.id,
        payload: { name: row.name, rules: rules.length },
      });
      return this.mapSegment(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw AppError.conflict('Segment name already exists');
      }
      throw e;
    }
  }

  async update(
    tenantId: string,
    id: string,
    input: {
      name?: string;
      description?: string;
      logic?: string;
      status?: string;
      rules?: RuleIn[];
    },
    actorId?: string,
  ) {
    await this.requireSegment(tenantId, id);
    if (input.logic && input.logic.toUpperCase() !== 'AND' && input.logic.toUpperCase() !== 'OR') {
      throw AppError.validation('logic must be AND|OR');
    }

    await this.prisma.db.$transaction(async (tx) => {
      await tx.segment.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.logic !== undefined ? { logic: input.logic.toUpperCase() } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      if (input.rules) {
        const rules = input.rules.map((r, i) => this.normalizeRule(r, i));
        await tx.segmentRule.deleteMany({ where: { segmentId: id, tenantId } });
        if (rules.length) {
          await tx.segmentRule.createMany({
            data: rules.map((r) => ({
              id: createId('sgr'),
              tenantId,
              segmentId: id,
              field: r.field,
              op: r.op,
              value: r.value as Prisma.InputJsonValue,
              windowDays: r.window_days ?? null,
              sortOrder: r.sort_order ?? 0,
            })),
          });
        }
      }
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'crm.segment_update',
      entity: 'segment',
      entityId: id,
      payload: input as unknown as Prisma.InputJsonValue,
    });
    return this.get(tenantId, id);
  }

  async remove(tenantId: string, id: string, actorId?: string) {
    await this.requireSegment(tenantId, id);
    await this.prisma.db.segment.delete({ where: { id } });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'crm.segment_delete',
      entity: 'segment',
      entityId: id,
    });
    return { deleted: true, id };
  }

  async preview(tenantId: string, id: string, sampleLimit = 20) {
    const segment = await this.requireSegment(tenantId, id);
    const matched = await this.evaluate(tenantId, segment.logic, segment.rules);
    const sample = matched.slice(0, Math.min(Math.max(sampleLimit, 1), 50));
    return {
      segment_id: id,
      logic: segment.logic,
      rule_count: segment.rules.length,
      count: matched.length,
      sample_ids: sample.map((c) => c.id),
      sample: sample.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        rfm_segment: c.rfmSegment,
        lifetime_orders: c.lifetimeOrders,
      })),
    };
  }

  async materialize(tenantId: string, id: string, actorId?: string) {
    const segment = await this.requireSegment(tenantId, id);
    const matched = await this.evaluate(tenantId, segment.logic, segment.rules);
    const now = new Date();

    await this.prisma.db.$transaction(async (tx) => {
      await tx.segmentMembership.deleteMany({ where: { tenantId, segmentId: id } });
      if (matched.length) {
        await tx.segmentMembership.createMany({
          data: matched.map((c) => ({
            id: createId('sgm'),
            tenantId,
            segmentId: id,
            customerId: c.id,
            snapshotAt: now,
          })),
        });
      }
      await tx.segment.update({
        where: { id },
        data: {
          memberCount: matched.length,
          lastMaterializedAt: now,
          status: segment.status === 'draft' ? 'active' : segment.status,
        },
      });
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'crm.segment_materialize',
      entity: 'segment',
      entityId: id,
      payload: { member_count: matched.length },
    });

    return {
      segment_id: id,
      member_count: matched.length,
      materialized_at: now.toISOString(),
      sample_ids: matched.slice(0, 20).map((c) => c.id),
    };
  }

  async listMembers(tenantId: string, id: string, limit = 50) {
    await this.requireSegment(tenantId, id);
    const rows = await this.prisma.db.segmentMembership.findMany({
      where: { tenantId, segmentId: id },
      take: Math.min(Math.max(limit, 1), 200),
      orderBy: { snapshotAt: 'desc' },
      include: { customer: true },
    });
    return rows.map((r) => ({
      customer_id: r.customerId,
      name: r.customer.name,
      phone: r.customer.phone,
      email: r.customer.email,
      rfm_segment: r.customer.rfmSegment,
      snapshot_at: r.snapshotAt.toISOString(),
    }));
  }

  async membershipsForCustomer(tenantId: string, customerId: string) {
    const rows = await this.prisma.db.segmentMembership.findMany({
      where: { tenantId, customerId },
      include: { segment: true },
      orderBy: { snapshotAt: 'desc' },
    });
    return rows.map((r) => ({
      segment_id: r.segmentId,
      name: r.segment.name,
      status: r.segment.status,
      snapshot_at: r.snapshotAt.toISOString(),
    }));
  }

  private async evaluate(
    tenantId: string,
    logic: string,
    rules: Array<{
      field: string;
      op: string;
      value: Prisma.JsonValue;
      windowDays: number | null;
    }>,
  ) {
    const customers = await this.prisma.db.customer.findMany({
      where: { tenantId, status: { not: 'merged' } },
    });
    if (!rules.length) return customers;

    return customers.filter((c) => {
      const results = rules.map((rule) => {
        const actual = fieldValue(c, rule.field, rule.windowDays);
        if (rule.field === 'last_order_days' && rule.windowDays != null && actual === null) {
          return false;
        }
        return matchOp(actual, rule.op, rule.value);
      });
      return logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
    });
  }

  private normalizeRule(r: RuleIn, index: number) {
    const field = String(r.field || '').toLowerCase();
    const op = String(r.op || '').toLowerCase();
    if (!FIELDS.has(field)) throw AppError.validation(`Unsupported field: ${field}`);
    if (!OPS.has(op)) throw AppError.validation(`Unsupported op: ${op}`);
    return {
      field,
      op,
      value: r.value ?? null,
      window_days: r.window_days ?? null,
      sort_order: r.sort_order ?? index,
    };
  }

  private async requireSegment(tenantId: string, id: string) {
    const row = await this.prisma.db.segment.findFirst({
      where: { id, tenantId },
      include: { rules: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!row) throw AppError.notFound('Segment not found');
    return row;
  }

  private mapSegment(r: {
    id: string;
    name: string;
    description: string;
    logic: string;
    status: string;
    memberCount: number;
    lastMaterializedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    rules: Array<{
      id: string;
      field: string;
      op: string;
      value: Prisma.JsonValue;
      windowDays: number | null;
      sortOrder: number;
    }>;
  }) {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      logic: r.logic,
      status: r.status,
      member_count: r.memberCount,
      last_materialized_at: r.lastMaterializedAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
      rules: r.rules.map((rule) => ({
        id: rule.id,
        field: rule.field,
        op: rule.op,
        value: rule.value,
        window_days: rule.windowDays,
        sort_order: rule.sortOrder,
      })),
    };
  }
}
