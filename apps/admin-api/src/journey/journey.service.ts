import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const STEP_KINDS = new Set(['trigger', 'condition', 'delay', 'action', 'exit']);
const ACTION_TYPES = new Set([
  'tag',
  'voucher_stub',
  'send_email',
  'send_sms',
  'send_zns',
  'send_messenger',
]);

type StepIn = { kind: string; config?: Record<string, unknown>; sort_order?: number };

type StepConfig = Record<string, unknown>;

@Injectable()
export class JourneyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  status() {
    return {
      wave: 'C5',
      features: {
        journey_builder: true,
        enroll: true,
        drain_run_once: true,
        consent_guard: true,
        frequency_cap: true,
        conflict_one_active_per_category: true,
        action_stubs: [...ACTION_TYPES],
      },
    };
  }

  async list(tenantId: string) {
    const rows = await this.prisma.db.journey.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      include: {
        steps: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });
    return rows.map((r) => this.mapJourney(r));
  }

  async get(tenantId: string, id: string) {
    const row = await this.requireJourney(tenantId, id);
    return this.mapJourney(row);
  }

  async create(
    tenantId: string,
    input: {
      name: string;
      description?: string;
      category?: string;
      status?: string;
      trigger_type?: string;
      trigger_config?: Record<string, unknown>;
      required_consent?: string[];
      frequency_cap_days?: number;
      frequency_cap_count?: number;
      steps?: StepIn[];
    },
    actorId?: string,
  ) {
    const steps = (input.steps || this.defaultSteps()).map((s, i) => this.normalizeStep(s, i));
    try {
      const row = await this.prisma.db.journey.create({
        data: {
          id: createId('jrn'),
          tenantId,
          name: input.name.trim(),
          description: input.description || '',
          category: input.category || 'retention',
          status: input.status || 'draft',
          triggerType: input.trigger_type || 'manual',
          triggerConfig: (input.trigger_config || {}) as Prisma.InputJsonValue,
          requiredConsent: input.required_consent || [],
          frequencyCapDays: input.frequency_cap_days ?? 7,
          frequencyCapCount: input.frequency_cap_count ?? 1,
          steps: {
            create: steps.map((s) => ({
              id: createId('jst'),
              tenantId,
              sortOrder: s.sort_order,
              kind: s.kind,
              config: s.config as Prisma.InputJsonValue,
            })),
          },
        },
        include: {
          steps: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { enrollments: true } },
        },
      });
      await this.audit.write({
        tenantId,
        actorId,
        action: 'journey.create',
        entity: 'journey',
        entityId: row.id,
        payload: { name: row.name, steps: steps.length },
      });
      return this.mapJourney(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw AppError.conflict('Journey name already exists');
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
      category?: string;
      status?: string;
      trigger_type?: string;
      trigger_config?: Record<string, unknown>;
      required_consent?: string[];
      frequency_cap_days?: number;
      frequency_cap_count?: number;
      steps?: StepIn[];
    },
    actorId?: string,
  ) {
    await this.requireJourney(tenantId, id);
    await this.prisma.db.$transaction(async (tx) => {
      await tx.journey.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.trigger_type !== undefined ? { triggerType: input.trigger_type } : {}),
          ...(input.trigger_config !== undefined
            ? { triggerConfig: input.trigger_config as Prisma.InputJsonValue }
            : {}),
          ...(input.required_consent !== undefined
            ? { requiredConsent: input.required_consent }
            : {}),
          ...(input.frequency_cap_days !== undefined
            ? { frequencyCapDays: input.frequency_cap_days }
            : {}),
          ...(input.frequency_cap_count !== undefined
            ? { frequencyCapCount: input.frequency_cap_count }
            : {}),
        },
      });
      if (input.steps) {
        const steps = input.steps.map((s, i) => this.normalizeStep(s, i));
        await tx.journeyEnrollment.updateMany({
          where: { tenantId, journeyId: id, currentStepId: { not: null } },
          data: { currentStepId: null },
        });
        await tx.journeyStep.deleteMany({ where: { tenantId, journeyId: id } });
        await tx.journeyStep.createMany({
          data: steps.map((s) => ({
            id: createId('jst'),
            tenantId,
            journeyId: id,
            sortOrder: s.sort_order,
            kind: s.kind,
            config: s.config as Prisma.InputJsonValue,
          })),
        });
      }
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'journey.update',
      entity: 'journey',
      entityId: id,
      payload: input as unknown as Prisma.InputJsonValue,
    });
    return this.get(tenantId, id);
  }

  async remove(tenantId: string, id: string, actorId?: string) {
    await this.requireJourney(tenantId, id);
    await this.prisma.db.journey.delete({ where: { id } });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'journey.delete',
      entity: 'journey',
      entityId: id,
    });
    return { deleted: true, id };
  }

  /**
   * Enroll customer with BR-011 consent + frequency cap + category conflict guards.
   */
  async enroll(
    tenantId: string,
    journeyId: string,
    customerId: string,
    actorId?: string,
    opts?: { skip_drain?: boolean },
  ) {
    const journey = await this.requireJourney(tenantId, journeyId);
    if (journey.status !== 'active') {
      throw AppError.conflict('Journey must be active to enroll', { status: journey.status });
    }
    const customer = await this.prisma.db.customer.findFirst({
      where: { id: customerId, tenantId, status: { not: 'merged' } },
    });
    if (!customer) throw AppError.notFound('Customer not found');

    const missingConsent = this.missingConsent(customer, journey.requiredConsent);
    if (missingConsent.length) {
      const blocked = await this.prisma.db.journeyEnrollment.create({
        data: {
          id: createId('jen'),
          tenantId,
          journeyId,
          customerId,
          status: 'blocked',
          blockReason: `consent_missing:${missingConsent.join(',')}`,
        },
      });
      await this.log(tenantId, blocked.id, null, 'blocked', 'Consent guard', {
        missing: missingConsent,
      });
      return {
        enrollment: this.mapEnrollment(blocked),
        blocked: true,
        reason: 'consent',
        missing_consent: missingConsent,
      };
    }

    // Conflict: 1 active/waiting enrollment per category
    const conflict = await this.prisma.db.journeyEnrollment.findFirst({
      where: {
        tenantId,
        customerId,
        status: { in: ['active', 'waiting'] },
        journey: { category: journey.category },
      },
      include: { journey: true },
    });
    if (conflict) {
      throw AppError.conflict('Customer already active in category journey', {
        enrollment_id: conflict.id,
        journey_id: conflict.journeyId,
        category: journey.category,
      });
    }

    // Frequency cap
    if (journey.frequencyCapDays > 0 && journey.frequencyCapCount > 0) {
      const since = new Date(Date.now() - journey.frequencyCapDays * 86_400_000);
      const recent = await this.prisma.db.journeyEnrollment.count({
        where: {
          tenantId,
          customerId,
          journeyId,
          enrolledAt: { gte: since },
          status: { not: 'blocked' },
        },
      });
      if (recent >= journey.frequencyCapCount) {
        throw AppError.conflict('Frequency cap exceeded', {
          cap_days: journey.frequencyCapDays,
          cap_count: journey.frequencyCapCount,
          recent,
        });
      }
    }

    const first = journey.steps[0] || null;
    const enrollment = await this.prisma.db.journeyEnrollment.create({
      data: {
        id: createId('jen'),
        tenantId,
        journeyId,
        customerId,
        status: 'active',
        currentStepId: first?.id ?? null,
        lastActionAt: new Date(),
      },
    });
    await this.log(tenantId, enrollment.id, first?.id ?? null, 'ok', 'Enrolled', {
      trigger: journey.triggerType,
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'journey.enroll',
      entity: 'journey_enrollment',
      entityId: enrollment.id,
      payload: { journey_id: journeyId, customer_id: customerId },
    });

    let drainResult = null;
    if (!opts?.skip_drain) {
      drainResult = await this.drainEnrollment(tenantId, enrollment.id, actorId);
    }
    return {
      enrollment: this.mapEnrollment(
        await this.prisma.db.journeyEnrollment.findFirstOrThrow({ where: { id: enrollment.id } }),
      ),
      blocked: false,
      drain: drainResult,
    };
  }

  /** Process due enrollments (active or waiting past waitingUntil). */
  async drain(tenantId: string, opts?: { journey_id?: string; limit?: number }, actorId?: string) {
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    const now = new Date();
    const due = await this.prisma.db.journeyEnrollment.findMany({
      where: {
        tenantId,
        ...(opts?.journey_id ? { journeyId: opts.journey_id } : {}),
        OR: [
          { status: 'active' },
          { status: 'waiting', waitingUntil: { lte: now } },
        ],
      },
      orderBy: { enrolledAt: 'asc' },
      take: limit,
    });

    const results = [];
    for (const e of due) {
      results.push(await this.drainEnrollment(tenantId, e.id, actorId));
    }
    return { processed: results.length, results };
  }

  async listEnrollments(tenantId: string, journeyId: string, limit = 50) {
    await this.requireJourney(tenantId, journeyId);
    const rows = await this.prisma.db.journeyEnrollment.findMany({
      where: { tenantId, journeyId },
      orderBy: { enrolledAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: { customer: true },
    });
    return rows.map((r) => ({
      ...this.mapEnrollment(r),
      customer: {
        id: r.customer.id,
        name: r.customer.name,
        phone: r.customer.phone,
        email: r.customer.email,
      },
    }));
  }

  async listLogs(tenantId: string, enrollmentId: string, limit = 50) {
    const en = await this.prisma.db.journeyEnrollment.findFirst({
      where: { id: enrollmentId, tenantId },
    });
    if (!en) throw AppError.notFound('Enrollment not found');
    const rows = await this.prisma.db.journeyRunLog.findMany({
      where: { tenantId, enrollmentId },
      orderBy: { createdAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return rows.map((r) => ({
      id: r.id,
      step_id: r.stepId,
      status: r.status,
      message: r.message,
      payload: r.payload,
      created_at: r.createdAt.toISOString(),
    }));
  }

  private async drainEnrollment(tenantId: string, enrollmentId: string, actorId?: string) {
    let enrollment = await this.prisma.db.journeyEnrollment.findFirst({
      where: { id: enrollmentId, tenantId },
      include: {
        journey: { include: { steps: { orderBy: { sortOrder: 'asc' } } } },
        customer: true,
      },
    });
    if (!enrollment) throw AppError.notFound('Enrollment not found');
    if (!['active', 'waiting'].includes(enrollment.status)) {
      return { enrollment_id: enrollmentId, status: enrollment.status, steps_run: 0 };
    }

    const steps = enrollment.journey.steps;
    let stepsRun = 0;
    const maxHops = Math.max(steps.length + 2, 8);

    for (let hop = 0; hop < maxHops; hop++) {
      enrollment = await this.prisma.db.journeyEnrollment.findFirstOrThrow({
        where: { id: enrollmentId },
        include: {
          journey: { include: { steps: { orderBy: { sortOrder: 'asc' } } } },
          customer: true,
        },
      });
      if (!['active', 'waiting'].includes(enrollment.status)) break;

      const currentStepId = enrollment.currentStepId;
      const step =
        (currentStepId
          ? enrollment.journey.steps.find((s) => s.id === currentStepId)
          : enrollment.journey.steps[0]) || null;
      if (!step) {
        await this.finish(enrollmentId, 'completed');
        await this.log(tenantId, enrollmentId, null, 'ok', 'No steps — completed');
        break;
      }

      const cfg = (step.config || {}) as StepConfig;
      const kind = step.kind;

      if (kind === 'delay') {
        const minutes = Number(cfg.minutes ?? cfg.delay_minutes ?? 0);
        if (enrollment.status === 'waiting' && enrollment.waitingUntil) {
          if (enrollment.waitingUntil.getTime() > Date.now()) {
            break; // still waiting
          }
          await this.prisma.db.journeyEnrollment.update({
            where: { id: enrollmentId },
            data: { status: 'active', waitingUntil: null },
          });
          await this.log(tenantId, enrollmentId, step.id, 'ok', 'Delay elapsed', { minutes });
          await this.advance(enrollmentId, enrollment.journey.steps, step.id);
          stepsRun += 1;
          continue;
        }
        if (minutes <= 0) {
          await this.log(tenantId, enrollmentId, step.id, 'ok', 'Delay 0 — skip', {});
          await this.advance(enrollmentId, enrollment.journey.steps, step.id);
          stepsRun += 1;
          continue;
        }
        const until = new Date(Date.now() + minutes * 60_000);
        await this.prisma.db.journeyEnrollment.update({
          where: { id: enrollmentId },
          data: { status: 'waiting', waitingUntil: until },
        });
        await this.log(tenantId, enrollmentId, step.id, 'ok', 'Delay started', {
          minutes,
          waiting_until: until.toISOString(),
        });
        stepsRun += 1;
        break;
      }

      if (kind === 'condition') {
        const ok = this.evalCondition(enrollment.customer, cfg);
        if (!ok) {
          await this.finish(enrollmentId, 'exited');
          await this.log(tenantId, enrollmentId, step.id, 'skipped', 'Condition failed — exit', cfg);
          stepsRun += 1;
          break;
        }
        await this.log(tenantId, enrollmentId, step.id, 'ok', 'Condition passed', cfg);
        await this.advance(enrollmentId, enrollment.journey.steps, step.id);
        stepsRun += 1;
        continue;
      }

      if (kind === 'action') {
        const actionResult = await this.runAction(tenantId, enrollment.customer, cfg);
        await this.log(
          tenantId,
          enrollmentId,
          step.id,
          actionResult.status,
          actionResult.message,
          actionResult.payload,
        );
        await this.prisma.db.journeyEnrollment.update({
          where: { id: enrollmentId },
          data: { lastActionAt: new Date() },
        });
        await this.advance(enrollmentId, enrollment.journey.steps, step.id);
        stepsRun += 1;
        continue;
      }

      if (kind === 'exit') {
        await this.finish(enrollmentId, 'completed');
        await this.log(tenantId, enrollmentId, step.id, 'ok', 'Exit step', cfg);
        stepsRun += 1;
        break;
      }

      // trigger — pass through
      await this.log(tenantId, enrollmentId, step.id, 'ok', 'Trigger step', cfg);
      await this.advance(enrollmentId, enrollment.journey.steps, step.id);
      stepsRun += 1;
    }

    void actorId;
    const fresh = await this.prisma.db.journeyEnrollment.findFirstOrThrow({
      where: { id: enrollmentId },
    });
    return {
      enrollment_id: enrollmentId,
      status: fresh.status,
      current_step_id: fresh.currentStepId,
      waiting_until: fresh.waitingUntil?.toISOString() ?? null,
      steps_run: stepsRun,
    };
  }

  private async runAction(
    tenantId: string,
    customer: {
      id: string;
      tags: string[];
      consentEmail: boolean;
      consentSms: boolean;
      consentZns: boolean;
      consentMessenger: boolean;
      consentMarketing: boolean;
    },
    cfg: StepConfig,
  ) {
    const type = String(cfg.type || cfg.action || 'tag');
    if (!ACTION_TYPES.has(type)) {
      return { status: 'failed', message: `Unknown action ${type}`, payload: cfg };
    }

    if (type === 'tag') {
      const tag = String(cfg.tag || cfg.value || 'journey');
      const tags = Array.from(new Set([...customer.tags, tag]));
      await this.prisma.db.customer.update({ where: { id: customer.id }, data: { tags } });
      return { status: 'ok', message: `Tagged ${tag}`, payload: { tag, tags } };
    }

    if (type === 'voucher_stub') {
      const code = String(cfg.code || `JV-${createId('').slice(0, 6).toUpperCase()}`);
      return {
        status: 'ok',
        message: `Voucher stub issued ${code}`,
        payload: { code, stub: true },
      };
    }

    // Channel sends — BR-011 consent check
    const channelMap: Record<string, { consent: boolean; channel: string }> = {
      send_email: { consent: customer.consentEmail, channel: 'email' },
      send_sms: { consent: customer.consentSms, channel: 'sms' },
      send_zns: { consent: customer.consentZns, channel: 'zns' },
      send_messenger: { consent: customer.consentMessenger, channel: 'messenger' },
    };
    const ch = channelMap[type];
    if (ch && !ch.consent) {
      return {
        status: 'skipped',
        message: `No ${ch.channel} consent — skip send`,
        payload: { channel: ch.channel, stub: true },
      };
    }
    if (type.startsWith('send_') && !customer.consentMarketing && type !== 'send_messenger') {
      // marketing master still gates broadcast-like channels except messenger thread reply stub
      if (['send_email', 'send_sms', 'send_zns'].includes(type) && !customer.consentMarketing) {
        return {
          status: 'skipped',
          message: 'No marketing consent — skip send',
          payload: { channel: ch?.channel, stub: true },
        };
      }
    }

    const template = String(cfg.template || cfg.body || 'Hello from journey');
    return {
      status: 'ok',
      message: `Stub send ${type}`,
      payload: {
        channel: ch?.channel || type,
        template,
        stub: true,
        tenant_id: tenantId,
        customer_id: customer.id,
      },
    };
  }

  private evalCondition(
    customer: {
      tags: string[];
      status: string;
      lifetimeOrders: number;
      consentEmail: boolean;
      rfmSegment: string | null;
    },
    cfg: StepConfig,
  ) {
    const field = String(cfg.field || '');
    const op = String(cfg.op || 'eq');
    const expected = cfg.value;
    let actual: unknown = null;
    switch (field) {
      case 'tags':
        actual = customer.tags;
        break;
      case 'status':
        actual = customer.status;
        break;
      case 'lifetime_orders':
        actual = customer.lifetimeOrders;
        break;
      case 'consent_email':
        actual = customer.consentEmail;
        break;
      case 'rfm_segment':
        actual = customer.rfmSegment;
        break;
      default:
        actual = null;
    }
    if (op === 'has_tag') {
      return Array.isArray(actual) && actual.includes(String(expected));
    }
    if (op === 'eq') return String(actual) === String(expected);
    if (op === 'neq') return String(actual) !== String(expected);
    if (op === 'gte') return Number(actual) >= Number(expected);
    if (op === 'lte') return Number(actual) <= Number(expected);
    if (op === 'gt') return Number(actual) > Number(expected);
    if (op === 'lt') return Number(actual) < Number(expected);
    return false;
  }

  private async advance(
    enrollmentId: string,
    steps: Array<{ id: string; sortOrder: number }>,
    currentStepId: string,
  ) {
    const idx = steps.findIndex((s) => s.id === currentStepId);
    const next = idx >= 0 ? steps[idx + 1] : null;
    if (!next) {
      await this.finish(enrollmentId, 'completed');
      return;
    }
    await this.prisma.db.journeyEnrollment.update({
      where: { id: enrollmentId },
      data: { currentStepId: next.id, status: 'active', waitingUntil: null },
    });
  }

  private async finish(enrollmentId: string, status: 'completed' | 'exited') {
    await this.prisma.db.journeyEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status,
        completedAt: new Date(),
        waitingUntil: null,
      },
    });
  }

  private async log(
    tenantId: string,
    enrollmentId: string,
    stepId: string | null,
    status: string,
    message: string,
    payload: Record<string, unknown> = {},
  ) {
    await this.prisma.db.journeyRunLog.create({
      data: {
        id: createId('jrl'),
        tenantId,
        enrollmentId,
        stepId,
        status,
        message,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  private missingConsent(
    customer: {
      consentEmail: boolean;
      consentSms: boolean;
      consentZns: boolean;
      consentMessenger: boolean;
      consentMarketing: boolean;
    },
    required: string[],
  ) {
    const map: Record<string, boolean> = {
      email: customer.consentEmail,
      sms: customer.consentSms,
      zns: customer.consentZns,
      messenger: customer.consentMessenger,
      marketing: customer.consentMarketing,
    };
    return required.filter((c) => !map[c]);
  }

  private defaultSteps(): StepIn[] {
    return [
      { kind: 'trigger', config: { type: 'manual' }, sort_order: 0 },
      {
        kind: 'condition',
        config: { field: 'consent_email', op: 'eq', value: true },
        sort_order: 1,
      },
      { kind: 'delay', config: { minutes: 0 }, sort_order: 2 },
      {
        kind: 'action',
        config: { type: 'tag', tag: 'journey_welcome' },
        sort_order: 3,
      },
      {
        kind: 'action',
        config: { type: 'send_email', template: 'Welcome stub' },
        sort_order: 4,
      },
      { kind: 'exit', config: { reason: 'done' }, sort_order: 5 },
    ];
  }

  private normalizeStep(s: StepIn, index: number) {
    const kind = String(s.kind || '').toLowerCase();
    if (!STEP_KINDS.has(kind)) throw AppError.validation(`Invalid step kind: ${kind}`);
    const config = s.config || {};
    if (kind === 'action') {
      const type = String(config.type || config.action || '');
      if (type && !ACTION_TYPES.has(type)) {
        throw AppError.validation(`Invalid action type: ${type}`);
      }
    }
    return {
      kind,
      config,
      sort_order: s.sort_order ?? index,
    };
  }

  private async requireJourney(tenantId: string, id: string) {
    const row = await this.prisma.db.journey.findFirst({
      where: { id, tenantId },
      include: {
        steps: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!row) throw AppError.notFound('Journey not found');
    return row;
  }

  private mapJourney(r: {
    id: string;
    name: string;
    description: string;
    category: string;
    status: string;
    triggerType: string;
    triggerConfig: Prisma.JsonValue;
    requiredConsent: string[];
    frequencyCapDays: number;
    frequencyCapCount: number;
    createdAt: Date;
    updatedAt: Date;
    steps: Array<{
      id: string;
      sortOrder: number;
      kind: string;
      config: Prisma.JsonValue;
    }>;
    _count?: { enrollments: number };
  }) {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      status: r.status,
      trigger_type: r.triggerType,
      trigger_config: r.triggerConfig,
      required_consent: r.requiredConsent,
      frequency_cap_days: r.frequencyCapDays,
      frequency_cap_count: r.frequencyCapCount,
      enrollment_count: r._count?.enrollments ?? 0,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
      steps: r.steps.map((s) => ({
        id: s.id,
        sort_order: s.sortOrder,
        kind: s.kind,
        config: s.config,
      })),
    };
  }

  private mapEnrollment(r: {
    id: string;
    journeyId: string;
    customerId: string;
    status: string;
    currentStepId: string | null;
    waitingUntil: Date | null;
    blockReason: string | null;
    enrolledAt: Date;
    completedAt: Date | null;
    lastActionAt: Date | null;
  }) {
    return {
      id: r.id,
      journey_id: r.journeyId,
      customer_id: r.customerId,
      status: r.status,
      current_step_id: r.currentStepId,
      waiting_until: r.waitingUntil?.toISOString() ?? null,
      block_reason: r.blockReason,
      enrolled_at: r.enrolledAt.toISOString(),
      completed_at: r.completedAt?.toISOString() ?? null,
      last_action_at: r.lastActionAt?.toISOString() ?? null,
    };
  }
}
