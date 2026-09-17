import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SocialService } from '../social/social.service';
import { CxService } from '../cx/cx.service';
import { AiGatewayClient, type AiKind } from './ai-gateway.client';
import { AiBudgetService } from './ai-budget.service';

const HIGH_RISK_KINDS: AiKind[] = [
  'shopping_qa',
  'social_reply',
  'care_reply',
  'nba_suggest',
];

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly gateway: AiGatewayClient,
    private readonly budget: AiBudgetService,
    @Inject(forwardRef(() => SocialService))
    private readonly social: SocialService,
    @Inject(forwardRef(() => CxService))
    private readonly cx: CxService,
  ) {}

  status() {
    return {
      wave: 'B6',
      gateway: this.gateway.status(),
      guardrails: {
        auto_publish: false,
        price_mutation: false,
        refund_mutation: false,
        auto_send: false,
        high_risk_requires_approval: true,
        social_reply_requires_approval: true,
        care_reply_requires_approval: true,
        nba_suggest_requires_approval: true,
      },
    };
  }

  async getBudget(tenantId: string) {
    return this.budget.getBudget(tenantId);
  }

  async createAction(
    tenantId: string,
    input: {
      storefrontId?: string;
      kind: AiKind;
      payload: Record<string, unknown>;
    },
    actorId?: string,
  ) {
    if (!this.gateway.enabled()) {
      throw AppError.validation('AI gateway disabled (FEATURE_AI_GATEWAY=false)');
    }

    let generated;
    try {
      generated = await this.gateway.generate({
        tenantId,
        kind: input.kind,
        payload: input.payload,
        storefrontId: input.storefrontId,
        actorId,
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'AI_BUDGET_EXCEEDED') {
        throw AppError.validation('AI budget exceeded', (e as Error & { details?: unknown }).details);
      }
      throw e;
    }

    // Enforce risk matrix: shopping_qa + social_reply always high + pending_approval
    const risk = HIGH_RISK_KINDS.includes(input.kind) ? 'high' : generated.risk;
    const status = risk === 'high' ? 'pending_approval' : generated.status_hint;

    await this.budget.assertAndCharge(tenantId, generated.cost_usd);

    const output = {
      ...generated.output,
      guardrails: generated.guardrails,
      rag_hits: generated.rag_hits,
      engine: generated.engine,
      policy: {
        auto_publish: false,
        price_mutation: false,
        refund_mutation: false,
        ...(typeof generated.output.policy === 'object' && generated.output.policy
          ? (generated.output.policy as object)
          : {}),
      },
    };

    const row = await this.prisma.db.aiAction.create({
      data: {
        id: createId('aia'),
        tenantId,
        storefrontId: input.storefrontId,
        kind: input.kind,
        risk,
        status,
        input: input.payload as Prisma.InputJsonValue,
        output: output as Prisma.InputJsonValue,
        costUsd: generated.cost_usd,
        model: generated.model,
        promptTokens: generated.prompt_tokens,
        completionTokens: generated.completion_tokens,
        gatewayRequestId: generated.request_id,
        requestedBy: actorId,
      },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'ai.create',
      entity: 'ai_action',
      entityId: row.id,
      payload: {
        kind: input.kind,
        risk,
        status,
        cost_usd: generated.cost_usd,
        engine: generated.engine,
        gateway_request_id: generated.request_id,
      },
    });

    return this.mapAi(row);
  }

  async reviewAction(
    tenantId: string,
    id: string,
    decision: 'approved' | 'rejected',
    note: string,
    actorId: string,
  ) {
    const row = await this.prisma.db.aiAction.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('AI action not found');
    if (row.risk === 'high' && row.status !== 'pending_approval' && row.status !== 'draft') {
      throw AppError.conflict('AI action not awaiting review');
    }
    const updated = await this.prisma.db.aiAction.update({
      where: { id },
      data: { status: decision, reviewedBy: actorId, reviewNote: note },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'ai.review',
      entity: 'ai_action',
      entityId: id,
      payload: { decision, note },
    });
    return this.mapAi(updated);
  }

  /**
   * Apply draft output — never publishes theme or mutates price.
   * High-risk must be approved first.
   * social_reply → send outbound via SocialService (FR-SOC-003 · BR-018).
   */
  async applyAction(tenantId: string, id: string, actorId: string) {
    const row = await this.prisma.db.aiAction.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('AI action not found');
    if (row.risk === 'high' && row.status !== 'approved') {
      throw AppError.conflict('High-risk AI action requires approval before apply', {
        status: row.status,
        risk: row.risk,
      });
    }
    if (row.status === 'rejected') throw AppError.conflict('Rejected AI action cannot be applied');
    if (row.status === 'applied') {
      return {
        ...this.mapAi(row),
        applied: {
          side_effects: [],
          auto_publish: false,
          price_changed: false,
          message_sent: false,
          deduped: true,
        },
      };
    }

    const output = row.output as Record<string, unknown>;
    const policy = (output.policy || {}) as Record<string, unknown>;
    if (policy.auto_publish === true || policy.price_mutation === true || policy.refund_mutation === true) {
      throw AppError.conflict('Guardrail blocked apply — publish/price/refund forbidden');
    }
    if (policy.auto_send === true) {
      throw AppError.conflict('Guardrail blocked apply — auto_send forbidden');
    }

    let messageSent: { id: string; body: string } | null = null;
    let cxApplied: Record<string, unknown> | null = null;
    if (row.kind === 'social_reply') {
      const input = row.input as Record<string, unknown>;
      const conversationId = String(input.conversation_id || '');
      if (!conversationId) throw AppError.validation('social_reply missing conversation_id');
      const body = String(
        output.reply_draft || output.answer_draft || input.edited_body || '',
      ).trim();
      if (!body) throw AppError.validation('social_reply missing reply_draft');
      const msg = await this.social.reply(tenantId, conversationId, body, actorId);
      messageSent = { id: msg.id, body: msg.body };
    } else if (row.kind === 'care_reply' || row.kind === 'nba_suggest') {
      cxApplied = await this.cx.onAiApplied(
        tenantId,
        {
          id: row.id,
          kind: row.kind,
          input: row.input,
          output: row.output,
        },
        actorId,
      );
    }

    const updated = await this.prisma.db.aiAction.update({
      where: { id },
      data: { status: 'applied' },
    });
    const appliedAs =
      row.kind === 'social_reply'
        ? 'social_outbound'
        : row.kind === 'care_reply'
          ? 'care_draft_on_ticket'
          : row.kind === 'nba_suggest'
            ? 'nba_materialize'
            : 'draft_only';
    await this.audit.write({
      tenantId,
      actorId,
      action: 'ai.apply',
      entity: 'ai_action',
      entityId: id,
      payload: {
        kind: row.kind,
        applied_as: appliedAs,
        message_id: messageSent?.id ?? null,
        cx: cxApplied,
        note:
          row.kind === 'social_reply'
            ? 'Sent approved AI reply to channel stub'
            : row.kind === 'care_reply'
              ? 'Saved care draft on ticket — no auto-send/refund'
              : row.kind === 'nba_suggest'
                ? 'Materialized NBA suggestions — no auto-refund'
                : 'No theme publish / price / refund side-effects',
      } as Prisma.InputJsonValue,
    });
    return {
      ...this.mapAi(updated),
      applied: {
        side_effects: [
          ...(messageSent ? ['social_outbound'] : []),
          ...((cxApplied?.side_effects as string[]) || []),
        ],
        auto_publish: false,
        price_changed: false,
        message_sent: Boolean(messageSent),
        message_id: messageSent?.id ?? null,
        refund: false,
        ...(cxApplied || {}),
      },
    };
  }

  async listActions(tenantId: string, storefrontId?: string) {
    const rows = await this.prisma.db.aiAction.findMany({
      where: { tenantId, ...(storefrontId ? { storefrontId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => this.mapAi(r));
  }

  /** AC helper: share of high-risk actions that are/were gated by approval. */
  async highRiskApprovalCoverage(tenantId: string) {
    const high = await this.prisma.db.aiAction.findMany({
      where: { tenantId, risk: 'high' },
      select: { status: true },
    });
    const gated = high.filter((h) =>
      ['pending_approval', 'approved', 'rejected', 'applied'].includes(h.status),
    );
    const pct = high.length === 0 ? 100 : Math.round((gated.length / high.length) * 1000) / 10;
    return {
      high_risk_total: high.length,
      approval_gated: gated.length,
      coverage_pct: pct,
      ok: pct >= 100,
    };
  }

  private mapAi(row: {
    id: string;
    kind: string;
    risk: string;
    status: string;
    input: unknown;
    output: unknown;
    costUsd?: Prisma.Decimal | null;
    model?: string | null;
    promptTokens?: number | null;
    completionTokens?: number | null;
    gatewayRequestId?: string | null;
    requestedBy: string | null;
    reviewedBy: string | null;
    reviewNote: string | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      kind: row.kind,
      risk: row.risk,
      status: row.status,
      input: row.input,
      output: row.output,
      cost_usd: row.costUsd != null ? Number(row.costUsd) : null,
      model: row.model ?? null,
      prompt_tokens: row.promptTokens ?? null,
      completion_tokens: row.completionTokens ?? null,
      gateway_request_id: row.gatewayRequestId ?? null,
      requested_by: row.requestedBy,
      reviewed_by: row.reviewedBy,
      review_note: row.reviewNote,
      created_at: row.createdAt.toISOString(),
    };
  }
}
