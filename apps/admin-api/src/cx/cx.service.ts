import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiService } from '../ai/ai.service';

const NBA_ACTIONS = new Set([
  'call',
  'voucher',
  'live_invite',
  'no_contact',
  'reminder',
  'care',
  'escalation',
]);

const NEGATIVE_KEYWORDS = [
  'tệ',
  'lừa',
  'refund',
  'hoàn tiền',
  'kém',
  'scam',
  'angry',
  'đòi',
  'chậm',
];

@Injectable()
export class CxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(forwardRef(() => AiService))
    private readonly ai: AiService,
  ) {}

  status() {
    return {
      wave: 'C6',
      features: {
        service_tickets: true,
        playbook_scan: true,
        nba_recommend: true,
        care_reply_ai: true,
        nba_suggest_ai: true,
        approval_required: true,
        no_auto_refund: true,
      },
      playbooks: ['delay_cod', 'fail_payment', 'negative_keyword', 'manual', 'vip_care'],
      nba_actions: [...NBA_ACTIONS],
    };
  }

  async listTickets(
    tenantId: string,
    query?: { customer_id?: string; status?: string; limit?: number },
  ) {
    const rows = await this.prisma.db.serviceTicket.findMany({
      where: {
        tenantId,
        ...(query?.customer_id ? { customerId: query.customer_id } : {}),
        ...(query?.status ? { status: query.status } : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(query?.limit ?? 50, 1), 100),
      include: { customer: true },
    });
    return rows.map((r) => this.mapTicket(r, r.customer));
  }

  async getTicket(tenantId: string, id: string) {
    const row = await this.prisma.db.serviceTicket.findFirst({
      where: { id, tenantId },
      include: { customer: true, nbaItems: true },
    });
    if (!row) throw AppError.notFound('Ticket not found');
    return {
      ...this.mapTicket(row, row.customer),
      nba: row.nbaItems.map((n) => this.mapNba(n)),
    };
  }

  async createTicket(
    tenantId: string,
    input: {
      customer_id: string;
      order_id?: string;
      conversation_id?: string;
      subject: string;
      description?: string;
      priority?: string;
      playbook_code?: string;
      trigger_type?: string;
      evidence?: Record<string, unknown>;
      owner_id?: string;
    },
    actorId?: string,
  ) {
    await this.requireCustomer(tenantId, input.customer_id);
    const row = await this.prisma.db.serviceTicket.create({
      data: {
        id: createId('tkt'),
        tenantId,
        customerId: input.customer_id,
        orderId: input.order_id,
        conversationId: input.conversation_id,
        subject: input.subject,
        description: input.description || '',
        priority: input.priority || 'normal',
        playbookCode: input.playbook_code || 'manual',
        triggerType: input.trigger_type || 'manual',
        evidence: (input.evidence || {}) as Prisma.InputJsonValue,
        ownerId: input.owner_id || actorId,
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'cx.ticket_create',
      entity: 'service_ticket',
      entityId: row.id,
      payload: { playbook: row.playbookCode, customer_id: input.customer_id },
    });
    return this.mapTicket(row);
  }

  async updateTicket(
    tenantId: string,
    id: string,
    input: {
      status?: string;
      priority?: string;
      owner_id?: string | null;
      description?: string;
      care_reply_draft?: string | null;
    },
    actorId?: string,
  ) {
    await this.requireTicket(tenantId, id);
    const updated = await this.prisma.db.serviceTicket.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.owner_id !== undefined ? { ownerId: input.owner_id } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.care_reply_draft !== undefined
          ? { careReplyDraft: input.care_reply_draft }
          : {}),
        ...(input.status === 'resolved' || input.status === 'closed'
          ? { resolvedAt: new Date() }
          : {}),
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'cx.ticket_update',
      entity: 'service_ticket',
      entityId: id,
      payload: input as unknown as Prisma.InputJsonValue,
    });
    return this.mapTicket(updated);
  }

  /**
   * Scan playbook triggers → open tickets (idempotent-ish by open playbook+order/conversation).
   */
  async scanPlaybooks(tenantId: string, actorId?: string) {
    const created: string[] = [];
    const now = Date.now();
    const delayHours = 24;

    // delay_cod: COD pending older than 24h
    const delayed = await this.prisma.db.order.findMany({
      where: {
        tenantId,
        paymentMethod: 'COD',
        paymentStatus: { in: ['pending', 'unpaid'] },
        status: { not: 'CANCELLED' },
        customerId: { not: null },
        createdAt: { lte: new Date(now - delayHours * 3600_000) },
      },
      take: 30,
    });
    for (const o of delayed) {
      if (!o.customerId) continue;
      const exists = await this.prisma.db.serviceTicket.findFirst({
        where: {
          tenantId,
          orderId: o.id,
          playbookCode: 'delay_cod',
          status: { in: ['open', 'in_progress'] },
        },
      });
      if (exists) continue;
      const t = await this.createTicket(
        tenantId,
        {
          customer_id: o.customerId,
          order_id: o.id,
          subject: `COD delay · ${o.id}`,
          description: `Order COD pending >${delayHours}h`,
          priority: 'high',
          playbook_code: 'delay_cod',
          trigger_type: 'playbook_scan',
          evidence: {
            order_id: o.id,
            payment_status: o.paymentStatus,
            created_at: o.createdAt.toISOString(),
          },
        },
        actorId,
      );
      created.push(t.id);
    }

    // fail_payment
    const failed = await this.prisma.db.order.findMany({
      where: {
        tenantId,
        paymentStatus: { in: ['failed', 'cancelled'] },
        customerId: { not: null },
      },
      take: 30,
      orderBy: { createdAt: 'desc' },
    });
    for (const o of failed) {
      if (!o.customerId) continue;
      const exists = await this.prisma.db.serviceTicket.findFirst({
        where: {
          tenantId,
          orderId: o.id,
          playbookCode: 'fail_payment',
          status: { in: ['open', 'in_progress'] },
        },
      });
      if (exists) continue;
      const t = await this.createTicket(
        tenantId,
        {
          customer_id: o.customerId,
          order_id: o.id,
          subject: `Payment failed · ${o.id}`,
          description: `payment_status=${o.paymentStatus}`,
          priority: 'high',
          playbook_code: 'fail_payment',
          trigger_type: 'playbook_scan',
          evidence: { order_id: o.id, payment_status: o.paymentStatus },
        },
        actorId,
      );
      created.push(t.id);
    }

    // negative_keyword on recent inbound messages
    const messages = await this.prisma.db.inboxMessage.findMany({
      where: { tenantId, direction: 'inbound' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { conversation: true },
    });
    for (const m of messages) {
      const body = (m.body || '').toLowerCase();
      const hit = NEGATIVE_KEYWORDS.find((k) => body.includes(k));
      if (!hit) continue;
      const customerId = m.conversation.customerId;
      if (!customerId) continue;
      const exists = await this.prisma.db.serviceTicket.findFirst({
        where: {
          tenantId,
          conversationId: m.conversationId,
          playbookCode: 'negative_keyword',
          status: { in: ['open', 'in_progress'] },
        },
      });
      if (exists) continue;
      const t = await this.createTicket(
        tenantId,
        {
          customer_id: customerId,
          conversation_id: m.conversationId,
          subject: `Negative keyword «${hit}»`,
          description: m.body.slice(0, 200),
          priority: 'urgent',
          playbook_code: 'negative_keyword',
          trigger_type: 'playbook_scan',
          evidence: { keyword: hit, message_id: m.id, preview: m.body.slice(0, 120) },
        },
        actorId,
      );
      created.push(t.id);
    }

    return { created_count: created.length, ticket_ids: created };
  }

  /** Rule-based NBA from ticket / customer context (no AI). */
  async suggestNba(
    tenantId: string,
    input: {
      customer_id: string;
      ticket_id?: string;
      owner_id?: string;
    },
    actorId?: string,
  ) {
    await this.requireCustomer(tenantId, input.customer_id);
    let ticket = null as Awaited<ReturnType<typeof this.requireTicket>> | null;
    if (input.ticket_id) ticket = await this.requireTicket(tenantId, input.ticket_id);

    const playbook = ticket?.playbookCode || 'manual';
    const recs: Array<{
      action: string;
      reason: string;
      expected_outcome: string;
      estimated_cost: number;
      evidence: Record<string, unknown>;
    }> = [];

    if (playbook === 'delay_cod') {
      recs.push({
        action: 'call',
        reason: 'COD order delayed — confirm address & intent',
        expected_outcome: 'Reduce cancel risk',
        estimated_cost: 5000,
        evidence: { playbook, order_id: ticket?.orderId },
      });
      recs.push({
        action: 'reminder',
        reason: 'Send soft reminder before escalate',
        expected_outcome: 'Customer responds',
        estimated_cost: 500,
        evidence: { playbook },
      });
    } else if (playbook === 'fail_payment') {
      recs.push({
        action: 'voucher',
        reason: 'Payment failed — offer small recovery voucher (manual issue)',
        expected_outcome: 'Retry checkout',
        estimated_cost: 20000,
        evidence: { playbook, order_id: ticket?.orderId },
      });
      recs.push({
        action: 'care',
        reason: 'Care message with alternate payment options',
        expected_outcome: 'Recover order',
        estimated_cost: 0,
        evidence: { playbook },
      });
    } else if (playbook === 'negative_keyword') {
      recs.push({
        action: 'escalation',
        reason: 'Negative sentiment — escalate to owner',
        expected_outcome: 'Human care within SLA',
        estimated_cost: 0,
        evidence: ticket?.evidence as Record<string, unknown>,
      });
      recs.push({
        action: 'no_contact',
        reason: 'If already resolved offline — mark no further outreach',
        expected_outcome: 'Avoid spam',
        estimated_cost: 0,
        evidence: {},
      });
    } else {
      recs.push({
        action: 'live_invite',
        reason: 'Engage via live/commerce session stub',
        expected_outcome: 'Re-engage',
        estimated_cost: 0,
        evidence: { playbook },
      });
      recs.push({
        action: 'care',
        reason: 'Generic care follow-up',
        expected_outcome: 'CSAT',
        estimated_cost: 0,
        evidence: {},
      });
    }

    const created = [];
    for (const r of recs) {
      const row = await this.prisma.db.nbaRecommendation.create({
        data: {
          id: createId('nba'),
          tenantId,
          customerId: input.customer_id,
          ticketId: input.ticket_id,
          action: r.action,
          reason: r.reason,
          expectedOutcome: r.expected_outcome,
          estimatedCost: r.estimated_cost,
          evidence: r.evidence as Prisma.InputJsonValue,
          ownerId: input.owner_id || actorId,
          status: 'suggested',
        },
      });
      created.push(this.mapNba(row));
    }
    await this.audit.write({
      tenantId,
      actorId,
      action: 'cx.nba_suggest',
      entity: 'nba_recommendation',
      entityId: created[0]?.id || input.customer_id,
      payload: { count: created.length, playbook },
    });
    return { recommendations: created };
  }

  async listNba(
    tenantId: string,
    query?: { customer_id?: string; status?: string; limit?: number },
  ) {
    const rows = await this.prisma.db.nbaRecommendation.findMany({
      where: {
        tenantId,
        ...(query?.customer_id ? { customerId: query.customer_id } : {}),
        ...(query?.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(query?.limit ?? 50, 1), 100),
    });
    return rows.map((r) => this.mapNba(r));
  }

  async updateNba(
    tenantId: string,
    id: string,
    input: { status?: string; owner_id?: string | null },
    actorId?: string,
  ) {
    const row = await this.prisma.db.nbaRecommendation.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('NBA not found');
    if (input.status && !['suggested', 'accepted', 'dismissed', 'applied'].includes(input.status)) {
      throw AppError.validation('Invalid NBA status');
    }
    const updated = await this.prisma.db.nbaRecommendation.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.owner_id !== undefined ? { ownerId: input.owner_id } : {}),
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'cx.nba_update',
      entity: 'nba_recommendation',
      entityId: id,
      payload: input as unknown as Prisma.InputJsonValue,
    });
    return this.mapNba(updated);
  }

  /**
   * Apply NBA stub — tag / note only. Never refund. Voucher = stub code in evidence.
   */
  async applyNba(tenantId: string, id: string, actorId?: string) {
    const row = await this.prisma.db.nbaRecommendation.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('NBA not found');
    if (row.status === 'dismissed') throw AppError.conflict('NBA dismissed');
    if (row.status === 'applied') return { ...this.mapNba(row), applied: { deduped: true } };

    if (!NBA_ACTIONS.has(row.action)) throw AppError.validation(`Unknown action ${row.action}`);

    const sideEffects: string[] = [];
    const customer = await this.requireCustomer(tenantId, row.customerId);

    if (row.action === 'voucher') {
      const code = `CARE-${createId('').slice(0, 6).toUpperCase()}`;
      sideEffects.push(`voucher_stub:${code}`);
      await this.prisma.db.nbaRecommendation.update({
        where: { id },
        data: {
          evidence: {
            ...(row.evidence as object),
            voucher_stub_code: code,
          } as Prisma.InputJsonValue,
        },
      });
    } else if (row.action === 'no_contact') {
      const tags = Array.from(new Set([...customer.tags, 'no_contact']));
      await this.prisma.db.customer.update({ where: { id: customer.id }, data: { tags } });
      sideEffects.push('tag:no_contact');
    } else if (row.action === 'care' || row.action === 'reminder' || row.action === 'call') {
      const tag = `nba_${row.action}`;
      const tags = Array.from(new Set([...customer.tags, tag]));
      await this.prisma.db.customer.update({ where: { id: customer.id }, data: { tags } });
      sideEffects.push(`tag:${tag}`);
    } else if (row.action === 'live_invite') {
      const tags = Array.from(new Set([...customer.tags, 'live_invite']));
      await this.prisma.db.customer.update({ where: { id: customer.id }, data: { tags } });
      sideEffects.push('tag:live_invite');
    } else if (row.action === 'escalation') {
      if (row.ticketId) {
        await this.prisma.db.serviceTicket.update({
          where: { id: row.ticketId },
          data: { priority: 'urgent', ownerId: actorId || row.ownerId, status: 'in_progress' },
        });
        sideEffects.push('ticket_escalated');
      }
    }

    const updated = await this.prisma.db.nbaRecommendation.update({
      where: { id },
      data: { status: 'applied', appliedAt: new Date(), ownerId: actorId || row.ownerId },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'cx.nba_apply',
      entity: 'nba_recommendation',
      entityId: id,
      payload: { action: row.action, side_effects: sideEffects, refund: false },
    });
    return {
      ...this.mapNba(updated),
      applied: { side_effects: sideEffects, refund: false, auto_send: false },
    };
  }

  /** AI care_reply draft → pending_approval (BR-018). */
  async suggestCareReply(
    tenantId: string,
    input: { ticket_id: string; tone?: string; storefront_id?: string },
    actorId?: string,
  ) {
    const ticket = await this.requireTicket(tenantId, input.ticket_id);
    const customer = await this.requireCustomer(tenantId, ticket.customerId);
    const action = await this.ai.createAction(
      tenantId,
      {
        storefrontId: input.storefront_id,
        kind: 'care_reply',
        payload: {
          ticket_id: ticket.id,
          customer_id: customer.id,
          customer_name: customer.name || 'bạn',
          subject: ticket.subject,
          description: ticket.description,
          playbook: ticket.playbookCode,
          tone: input.tone || 'empathetic',
          evidence: ticket.evidence,
        },
      },
      actorId,
    );
    await this.prisma.db.serviceTicket.update({
      where: { id: ticket.id },
      data: { aiActionId: action.id },
    });
    return {
      ticket_id: ticket.id,
      ai_action: action,
      requires_approval: action.status === 'pending_approval',
    };
  }

  /** AI nba_suggest → pending_approval; after approve+apply materializes NBA rows. */
  async suggestNbaAi(
    tenantId: string,
    input: { customer_id: string; ticket_id?: string; storefront_id?: string },
    actorId?: string,
  ) {
    await this.requireCustomer(tenantId, input.customer_id);
    let playbook = 'manual';
    let evidence: unknown = {};
    if (input.ticket_id) {
      const t = await this.requireTicket(tenantId, input.ticket_id);
      playbook = t.playbookCode || 'manual';
      evidence = t.evidence;
    }
    const action = await this.ai.createAction(
      tenantId,
      {
        storefrontId: input.storefront_id,
        kind: 'nba_suggest',
        payload: {
          customer_id: input.customer_id,
          ticket_id: input.ticket_id,
          playbook,
          evidence,
        },
      },
      actorId,
    );
    return {
      ai_action: action,
      requires_approval: action.status === 'pending_approval',
    };
  }

  /** Called from AiService.apply for care_reply / nba_suggest. */
  async onAiApplied(
    tenantId: string,
    aiAction: {
      id: string;
      kind: string;
      input: unknown;
      output: unknown;
    },
    actorId?: string,
  ) {
    const input = (aiAction.input || {}) as Record<string, unknown>;
    const output = (aiAction.output || {}) as Record<string, unknown>;

    if (aiAction.kind === 'care_reply') {
      const ticketId = String(input.ticket_id || '');
      const draft = String(output.reply_draft || output.answer_draft || '').trim();
      if (ticketId && draft) {
        await this.prisma.db.serviceTicket.update({
          where: { id: ticketId },
          data: { careReplyDraft: draft, aiActionId: aiAction.id },
        });
      }
      return {
        side_effects: ticketId ? ['care_reply_draft_saved'] : [],
        draft_only: true,
        auto_send: false,
        refund: false,
      };
    }

    if (aiAction.kind === 'nba_suggest') {
      const customerId = String(input.customer_id || '');
      const ticketId = input.ticket_id ? String(input.ticket_id) : undefined;
      const suggestions = Array.isArray(output.suggestions)
        ? (output.suggestions as Array<Record<string, unknown>>)
        : [
            {
              action: String(output.action || 'care'),
              reason: String(output.reason || 'AI NBA'),
              expected_outcome: String(output.expected_outcome || ''),
              estimated_cost: Number(output.estimated_cost || 0),
            },
          ];
      const ids: string[] = [];
      for (const s of suggestions) {
        const action = String(s.action || 'care');
        if (!NBA_ACTIONS.has(action)) continue;
        const row = await this.prisma.db.nbaRecommendation.create({
          data: {
            id: createId('nba'),
            tenantId,
            customerId,
            ticketId,
            action,
            reason: String(s.reason || 'AI suggestion'),
            expectedOutcome: String(s.expected_outcome || ''),
            estimatedCost: Number(s.estimated_cost || 0),
            evidence: { source: 'ai_nba_suggest', ai_action_id: aiAction.id } as Prisma.InputJsonValue,
            ownerId: actorId,
            status: 'suggested',
            aiActionId: aiAction.id,
          },
        });
        ids.push(row.id);
      }
      return {
        side_effects: [`nba_created:${ids.length}`],
        nba_ids: ids,
        draft_only: false,
        auto_send: false,
        refund: false,
      };
    }

    return { side_effects: [], draft_only: true };
  }

  private async requireCustomer(tenantId: string, id: string) {
    const row = await this.prisma.db.customer.findFirst({
      where: { id, tenantId, status: { not: 'merged' } },
    });
    if (!row) throw AppError.notFound('Customer not found');
    return row;
  }

  private async requireTicket(tenantId: string, id: string) {
    const row = await this.prisma.db.serviceTicket.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Ticket not found');
    return row;
  }

  private mapTicket(
    r: {
      id: string;
      customerId: string;
      orderId: string | null;
      conversationId: string | null;
      subject: string;
      description: string;
      status: string;
      priority: string;
      playbookCode: string | null;
      triggerType: string | null;
      evidence: Prisma.JsonValue;
      ownerId: string | null;
      careReplyDraft: string | null;
      aiActionId: string | null;
      resolvedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    customer?: { name: string; phone: string | null; email: string | null },
  ) {
    return {
      id: r.id,
      customer_id: r.customerId,
      order_id: r.orderId,
      conversation_id: r.conversationId,
      subject: r.subject,
      description: r.description,
      status: r.status,
      priority: r.priority,
      playbook_code: r.playbookCode,
      trigger_type: r.triggerType,
      evidence: r.evidence,
      owner_id: r.ownerId,
      care_reply_draft: r.careReplyDraft,
      ai_action_id: r.aiActionId,
      resolved_at: r.resolvedAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
      ...(customer
        ? {
            customer: {
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
            },
          }
        : {}),
    };
  }

  private mapNba(r: {
    id: string;
    customerId: string;
    ticketId: string | null;
    action: string;
    reason: string;
    evidence: Prisma.JsonValue;
    expectedOutcome: string;
    estimatedCost: Prisma.Decimal;
    ownerId: string | null;
    status: string;
    aiActionId: string | null;
    createdAt: Date;
    appliedAt: Date | null;
  }) {
    return {
      id: r.id,
      customer_id: r.customerId,
      ticket_id: r.ticketId,
      action: r.action,
      reason: r.reason,
      evidence: r.evidence,
      expected_outcome: r.expectedOutcome,
      estimated_cost: Number(r.estimatedCost),
      owner_id: r.ownerId,
      status: r.status,
      ai_action_id: r.aiActionId,
      created_at: r.createdAt.toISOString(),
      applied_at: r.appliedAt?.toISOString() ?? null,
    };
  }
}
