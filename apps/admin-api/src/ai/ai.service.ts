import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiGatewayClient, type AiKind } from './ai-gateway.client';
import { AiBudgetService } from './ai-budget.service';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly gateway: AiGatewayClient,
    private readonly budget: AiBudgetService,
  ) {}

  status() {
    return {
      wave: 'A6',
      gateway: this.gateway.status(),
      guardrails: {
        auto_publish: false,
        price_mutation: false,
        refund_mutation: false,
        high_risk_requires_approval: true,
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

    // Enforce risk matrix: shopping_qa always high + pending_approval
    const risk = input.kind === 'shopping_qa' ? 'high' : generated.risk;
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

    const output = row.output as Record<string, unknown>;
    const policy = (output.policy || {}) as Record<string, unknown>;
    if (policy.auto_publish === true || policy.price_mutation === true || policy.refund_mutation === true) {
      throw AppError.conflict('Guardrail blocked apply — publish/price/refund forbidden');
    }

    const updated = await this.prisma.db.aiAction.update({
      where: { id },
      data: { status: 'applied' },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'ai.apply',
      entity: 'ai_action',
      entityId: id,
      payload: {
        kind: row.kind,
        applied_as: 'draft_only',
        note: 'No theme publish / price / refund side-effects',
      },
    });
    return {
      ...this.mapAi(updated),
      applied: {
        side_effects: [],
        auto_publish: false,
        price_changed: false,
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
