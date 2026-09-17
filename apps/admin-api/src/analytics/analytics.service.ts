import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PlatformService } from '../website/platform.service';

/** Assumed contribution margin rate when COGS not on order lines (W4 basic allocation). */
const DEFAULT_CONTRIBUTION_RATE = 0.42;

const FUNNEL_STEPS = ['page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase'] as const;

type Variant = {
  key: string;
  weight?: number;
  headline?: string;
  cta?: string;
  cta_href?: string;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly platform: PlatformService,
  ) {}

  private feature(name: string, fallback = true) {
    const raw = process.env[`FEATURE_${name.toUpperCase().replace(/\./g, '_')}`];
    if (raw === undefined) return fallback;
    return raw === '1' || raw === 'true';
  }

  private async sf(tenantId: string, storefrontId: string) {
    const row = await this.prisma.db.storefront.findFirst({ where: { id: storefrontId, tenantId } });
    if (!row) throw AppError.notFound('Storefront not found');
    return row;
  }

  // ─── Event collector (Postgres; Redpanda/CH deferred) ──────

  async collectEvent(
    tenantId: string,
    input: {
      storefrontId: string;
      name: string;
      sessionId?: string;
      customerId?: string;
      landingPath?: string;
      consentState?: string;
      experimentId?: string;
      variantKey?: string;
      payload?: Prisma.InputJsonValue;
    },
  ) {
    // Consent gate for marketing analytics events (not purchase which is transactional)
    const marketing = ['page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'experiment_exposed'].includes(
      input.name,
    );
    if (marketing && input.consentState === 'denied' && this.feature('analytics.consent_gate')) {
      return { id: null, skipped: true, reason: 'consent_denied' };
    }

    const row = await this.prisma.db.storefrontEvent.create({
      data: {
        id: createId('evt'),
        tenantId,
        storefrontId: input.storefrontId,
        name: input.name,
        sessionId: input.sessionId,
        customerId: input.customerId,
        landingPath: input.landingPath ?? '/',
        consentState: input.consentState ?? 'unknown',
        experimentId: input.experimentId,
        variantKey: input.variantKey,
        payload: input.payload ?? {},
      },
    });
    return {
      id: row.id,
      name: row.name,
      skipped: false,
      created_at: row.createdAt.toISOString(),
      sink: 'postgres', // ClickHouse/Redpanda planned — collector interface ready
    };
  }

  // ─── Dashboard aggregates ──────────────────────────────────

  async getDashboard(tenantId: string, storefrontId: string, days = 7) {
    await this.sf(tenantId, storefrontId);
    const since = new Date(Date.now() - days * 86400000);

    const events = await this.prisma.db.storefrontEvent.findMany({
      where: { tenantId, storefrontId, createdAt: { gte: since } },
      select: {
        name: true,
        sessionId: true,
        landingPath: true,
        createdAt: true,
        payload: true,
      },
    });

    const sessions = new Set(events.map((e) => e.sessionId).filter(Boolean) as string[]);
    const funnel = FUNNEL_STEPS.map((step) => {
      const count = events.filter((e) => e.name === step).length;
      const uniqueSessions = new Set(
        events.filter((e) => e.name === step && e.sessionId).map((e) => e.sessionId as string),
      ).size;
      return { step, count, unique_sessions: uniqueSessions || count };
    });

    const viewSessions = funnel.find((f) => f.step === 'view_item')?.unique_sessions || 0;
    const purchaseSessions = funnel.find((f) => f.step === 'purchase')?.unique_sessions || 0;
    const purchaseCvr = viewSessions > 0 ? purchaseSessions / viewSessions : 0;

    const orders = await this.prisma.db.order.findMany({
      where: { tenantId, storefrontId, createdAt: { gte: since } },
      select: { totalAmount: true, id: true },
    });
    const revenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const contribution = revenue * DEFAULT_CONTRIBUTION_RATE;
    const aov = orders.length ? revenue / orders.length : 0;

    const landings = await this.contributionByLanding(tenantId, storefrontId, days);
    const cwv = await this.getCwvSummary(tenantId, storefrontId);
    const incidents = await this.prisma.db.analyticsIncident.findMany({
      where: { tenantId, storefrontId, status: 'open' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const trackedPublished =
      (await this.prisma.db.storefront.count({
        where: { tenantId, status: 'published' },
      })) > 0;
    const hasFunnel = events.some((e) => e.name === 'page_view' || e.name === 'view_item');

    return {
      window_days: days,
      kpis: {
        sessions: sessions.size || events.filter((e) => e.name === 'page_view').length,
        purchase_cvr: Number((purchaseCvr * 100).toFixed(2)),
        web_contribution: Math.round(contribution),
        aov: Math.round(aov),
        revenue: Math.round(revenue),
        orders: orders.length,
      },
      funnel,
      funnel_insight: this.funnelInsight(funnel),
      landings,
      cwv,
      incidents: incidents.map((i) => ({
        id: i.id,
        kind: i.kind,
        severity: i.severity,
        status: i.status,
        evidence: i.evidence,
        created_at: i.createdAt.toISOString(),
      })),
      coverage: {
        published_tracked: trackedPublished && hasFunnel,
        contribution_rate_assumed: DEFAULT_CONTRIBUTION_RATE,
        sink: 'postgres',
      },
    };
  }

  private funnelInsight(funnel: Array<{ step: string; unique_sessions: number }>) {
    for (let i = 0; i < funnel.length - 1; i++) {
      const a = funnel[i].unique_sessions;
      const b = funnel[i + 1].unique_sessions;
      if (a > 0 && b / a < 0.35) {
        return `Drop mạnh ${funnel[i].step} → ${funnel[i + 1].step} (${Math.round((1 - b / a) * 100)}%)`;
      }
    }
    return 'Funnel ổn định trong cửa sổ đo';
  }

  async contributionByLanding(tenantId: string, storefrontId: string, days = 7) {
    const since = new Date(Date.now() - days * 86400000);
    const events = await this.prisma.db.storefrontEvent.findMany({
      where: { tenantId, storefrontId, createdAt: { gte: since } },
      select: { name: true, sessionId: true, landingPath: true, payload: true },
    });

    const byPath = new Map<
      string,
      { sessions: Set<string>; purchases: number; revenue: number }
    >();

    for (const e of events) {
      const path = e.landingPath || '/';
      if (!byPath.has(path)) byPath.set(path, { sessions: new Set(), purchases: 0, revenue: 0 });
      const row = byPath.get(path)!;
      if (e.sessionId) row.sessions.add(e.sessionId);
      if (e.name === 'purchase') {
        row.purchases += 1;
        const payload = e.payload as { total?: number; amount?: number };
        row.revenue += Number(payload.total ?? payload.amount ?? 0);
      }
    }

    // If purchase events lack amount, allocate order revenue proportionally by purchase count
    const orders = await this.prisma.db.order.findMany({
      where: { tenantId, storefrontId, createdAt: { gte: since } },
      select: { totalAmount: true },
    });
    const totalOrderRevenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const totalPurchases = [...byPath.values()].reduce((s, r) => s + r.purchases, 0);

    return [...byPath.entries()]
      .map(([path, row]) => {
        let revenue = row.revenue;
        if (revenue === 0 && totalPurchases > 0 && row.purchases > 0) {
          revenue = (totalOrderRevenue * row.purchases) / totalPurchases;
        }
        const sessions = row.sessions.size || (row.purchases ? row.purchases : 0);
        const cvr = sessions > 0 ? row.purchases / sessions : 0;
        const contribution = revenue * DEFAULT_CONTRIBUTION_RATE;
        return {
          path,
          sessions,
          purchases: row.purchases,
          cvr: Number((cvr * 100).toFixed(2)),
          revenue: Math.round(revenue),
          contribution: Math.round(contribution),
        };
      })
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 20);
  }

  // ─── CWV + publish health window ───────────────────────────

  async recordCwv(
    tenantId: string,
    storefrontId: string,
    input: {
      source?: string;
      path?: string;
      device?: string;
      lcp_ms: number;
      inp_ms?: number;
      cls?: number;
      publish_job_id?: string;
    },
    actorId?: string,
  ) {
    await this.sf(tenantId, storefrontId);
    const row = await this.prisma.db.cwvSnapshot.create({
      data: {
        id: createId('cwv'),
        tenantId,
        storefrontId,
        source: input.source ?? 'synthetic',
        path: input.path ?? '/',
        device: input.device ?? 'mobile',
        lcpMs: input.lcp_ms,
        inpMs: input.inp_ms,
        cls: input.cls,
        publishJobId: input.publish_job_id,
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'cwv.record',
      entity: 'cwv_snapshot',
      entityId: row.id,
      payload: { lcp_ms: input.lcp_ms, source: row.source },
    });
    return this.mapCwv(row);
  }

  async getCwvSummary(tenantId: string, storefrontId: string) {
    const latest = await this.prisma.db.cwvSnapshot.findMany({
      where: { tenantId, storefrontId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const baseline = latest.find((s) => s.source === 'baseline') || latest[latest.length - 1];
    const current = latest.find((s) => s.source !== 'baseline') || latest[0];
    let regression = false;
    let deltaPct = 0;
    if (baseline && current && baseline.id !== current.id) {
      deltaPct = ((current.lcpMs - baseline.lcpMs) / baseline.lcpMs) * 100;
      regression = deltaPct > 20;
    }
    return {
      latest: current ? this.mapCwv(current) : null,
      baseline: baseline ? this.mapCwv(baseline) : null,
      regression,
      lcp_delta_pct: Number(deltaPct.toFixed(1)),
      samples: latest.slice(0, 5).map((s) => this.mapCwv(s)),
    };
  }

  async runPublishHealthWindow(
    tenantId: string,
    storefrontId: string,
    opts?: { publish_job_id?: string; synthetic_lcp_ms?: number },
    actorId?: string,
  ) {
    await this.sf(tenantId, storefrontId);
    const baseline =
      (await this.prisma.db.cwvSnapshot.findFirst({
        where: { tenantId, storefrontId, source: 'baseline' },
        orderBy: { createdAt: 'desc' },
      })) ||
      (await this.prisma.db.cwvSnapshot.findFirst({
        where: { tenantId, storefrontId },
        orderBy: { createdAt: 'asc' },
      }));

    // Synthetic canary LCP (or forced bad via env)
    const forceBad = process.env.CWV_FORCE_REGRESSION === '1';
    const lcp = forceBad
      ? (baseline?.lcpMs || 1800) * 1.35
      : opts?.synthetic_lcp_ms ?? 1700 + Math.random() * 200;

    const canary = await this.recordCwv(
      tenantId,
      storefrontId,
      {
        source: 'canary',
        path: '/',
        device: 'mobile',
        lcp_ms: lcp,
        inp_ms: 80,
        cls: 0.04,
        publish_job_id: opts?.publish_job_id,
      },
      actorId,
    );

    // Checkout canary: require ≥1 active product with price
    const products = await this.prisma.db.product.count({
      where: { tenantId, status: 'active' },
    });
    const checkoutOk = products > 0;

    let incident = null;
    const regress =
      baseline && ((canary.lcp_ms - baseline.lcpMs) / baseline.lcpMs) * 100 > 20;

    if (regress || !checkoutOk) {
      incident = await this.prisma.db.analyticsIncident.create({
        data: {
          id: createId('ainc'),
          tenantId,
          storefrontId,
          kind: !checkoutOk ? 'checkout_canary_fail' : 'cwv_regression',
          severity: regress ? 'critical' : 'warn',
          status: 'open',
          evidence: {
            baseline_lcp_ms: baseline?.lcpMs,
            canary_lcp_ms: canary.lcp_ms,
            checkout_ok: checkoutOk,
          },
          publishJobId: opts?.publish_job_id,
        },
      });

      let rolledBack = false;
      if (regress && this.feature('auto.rollback', false)) {
        try {
          await this.platform.rollbackPublish(tenantId, storefrontId, actorId || 'system');
          rolledBack = true;
          await this.prisma.db.analyticsIncident.update({
            where: { id: incident.id },
            data: { status: 'auto_rolled_back', resolvedAt: new Date() },
          });
        } catch {
          /* no previous version */
        }
      }

      await this.audit.write({
        tenantId,
        actorId,
        action: 'analytics.incident',
        entity: 'analytics_incident',
        entityId: incident.id,
        payload: { rolled_back: rolledBack },
      });

      return {
        status: rolledBack ? 'auto_rolled_back' : 'incident_open',
        canary,
        checkout_ok: checkoutOk,
        incident_id: incident.id,
        rolled_back: rolledBack,
      };
    }

    // Promote canary as new baseline if healthy
    await this.prisma.db.cwvSnapshot.create({
      data: {
        id: createId('cwv'),
        tenantId,
        storefrontId,
        source: 'baseline',
        path: '/',
        device: 'mobile',
        lcpMs: canary.lcp_ms,
        inpMs: canary.inp_ms ?? undefined,
        cls: canary.cls ?? undefined,
        publishJobId: opts?.publish_job_id,
      },
    });

    return { status: 'healthy', canary, checkout_ok: checkoutOk, incident_id: null, rolled_back: false };
  }

  // ─── Experiments ───────────────────────────────────────────

  async listExperiments(tenantId: string, storefrontId: string) {
    await this.sf(tenantId, storefrontId);
    const rows = await this.prisma.db.experiment.findMany({
      where: { tenantId, storefrontId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapExperiment(r));
  }

  async upsertExperiment(
    tenantId: string,
    storefrontId: string,
    input: {
      code: string;
      name: string;
      metric?: string;
      variants: Variant[];
      status?: string;
    },
    actorId?: string,
  ) {
    await this.sf(tenantId, storefrontId);
    if (!input.variants?.length) throw AppError.validation('variants required');
    const existing = await this.prisma.db.experiment.findUnique({
      where: { storefrontId_code: { storefrontId, code: input.code } },
    });
    const data = {
      name: input.name,
      metric: input.metric ?? 'purchase_cvr',
      variants: input.variants as unknown as Prisma.InputJsonValue,
      status: input.status ?? existing?.status ?? 'draft',
      startedAt:
        input.status === 'running' && existing?.status !== 'running' ? new Date() : existing?.startedAt,
    };
    const row = existing
      ? await this.prisma.db.experiment.update({ where: { id: existing.id }, data })
      : await this.prisma.db.experiment.create({
          data: {
            id: createId('exp'),
            tenantId,
            storefrontId,
            code: input.code,
            ...data,
          },
        });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'experiment.upsert',
      entity: 'experiment',
      entityId: row.id,
    });
    return this.mapExperiment(row);
  }

  async assignVariant(tenantId: string, storefrontId: string, code: string, sessionId: string) {
    const exp = await this.prisma.db.experiment.findFirst({
      where: { tenantId, storefrontId, code, status: 'running' },
    });
    if (!exp) return { experiment_id: null, variant: null };
    const variants = exp.variants as Variant[];
    const key = this.pickVariant(sessionId + exp.id, variants);
    const variant = variants.find((v) => v.key === key) || variants[0];
    return {
      experiment_id: exp.id,
      code: exp.code,
      variant,
    };
  }

  private pickVariant(seed: string, variants: Variant[]) {
    const hash = createHash('sha256').update(seed).digest();
    const n = hash.readUInt32BE(0) / 0xffffffff;
    const total = variants.reduce((s, v) => s + (v.weight ?? 1), 0) || 1;
    let acc = 0;
    for (const v of variants) {
      acc += (v.weight ?? 1) / total;
      if (n <= acc) return v.key;
    }
    return variants[variants.length - 1].key;
  }

  async experimentStats(tenantId: string, storefrontId: string, code: string) {
    const exp = await this.prisma.db.experiment.findFirst({
      where: { tenantId, storefrontId, code },
    });
    if (!exp) throw AppError.notFound('Experiment not found');
    const events = await this.prisma.db.storefrontEvent.findMany({
      where: { tenantId, storefrontId, experimentId: exp.id },
      select: { name: true, variantKey: true, sessionId: true },
    });
    const variants = exp.variants as Variant[];
    return {
      experiment: this.mapExperiment(exp),
      variants: variants.map((v) => {
        const exposed = new Set(
          events
            .filter((e) => e.variantKey === v.key && e.name === 'experiment_exposed')
            .map((e) => e.sessionId),
        ).size;
        const purchases = events.filter(
          (e) => e.variantKey === v.key && e.name === 'purchase',
        ).length;
        return {
          key: v.key,
          exposed,
          purchases,
          cvr: exposed ? Number(((purchases / exposed) * 100).toFixed(2)) : 0,
        };
      }),
    };
  }

  // ─── AI assist (guardrailed) ───────────────────────────────

  async createAiAction(
    tenantId: string,
    input: {
      storefrontId?: string;
      kind: 'theme_match_explain' | 'headline_variants' | 'shopping_qa';
      payload: Record<string, unknown>;
    },
    actorId?: string,
  ) {
    const risk = input.kind === 'shopping_qa' ? 'high' : 'low';
    let output: Record<string, unknown> = {};

    if (input.kind === 'theme_match_explain') {
      const match = await this.platform.matchTemplates({
        industry: String(input.payload.industry || 'beauty'),
        goal: String(input.payload.goal || 'conversion'),
        budget: String(input.payload.budget || 'free'),
      });
      const top = match.matches[0];
      output = {
        explanation: top
          ? `Gợi ý ${top.template.name} (score ${top.score}) vì: ${(top.reasons || []).join('; ') || 'khớp ngành/mục tiêu'}. Playbook: ${(match.playbook || []).slice(0, 3).join(' → ')}.`
          : 'Chưa có template phù hợp.',
        top_code: top?.template.code,
        guardrail: 'Không auto-install — merchant xác nhận trong Marketplace.',
      };
    } else if (input.kind === 'headline_variants') {
      const base = String(input.payload.headline || 'Serum tái tạo da đêm');
      output = {
        variants: [
          base,
          `${base} — kết quả sau 7 đêm`,
          `Khám phá ${base.toLowerCase()}`,
          `Ưu đãi: ${base}`,
        ],
        guardrail: 'Draft only — không auto-publish vào Builder.',
      };
    } else {
      output = {
        answer_draft: `Câu trả lời nháp cho: "${input.payload.question || ''}". Kiểm tra policy/FAQ trước khi gửi khách.`,
        guardrail: 'High-risk: cần approval trước khi apply. Không commit giá/refund.',
      };
    }

    const status = risk === 'high' ? 'pending_approval' : 'draft';
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
        requestedBy: actorId,
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'ai.create',
      entity: 'ai_action',
      entityId: row.id,
      payload: { kind: input.kind, risk, status },
    });
    return this.mapAi(row);
  }

  async reviewAiAction(
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
      data: {
        status: decision,
        reviewedBy: actorId,
        reviewNote: note,
      },
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

  async listAiActions(tenantId: string, storefrontId?: string) {
    const rows = await this.prisma.db.aiAction.findMany({
      where: {
        tenantId,
        ...(storefrontId ? { storefrontId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => this.mapAi(r));
  }

  // ─── mappers ───────────────────────────────────────────────

  private mapCwv(row: {
    id: string;
    source: string;
    path: string;
    device: string;
    lcpMs: number;
    inpMs: number | null;
    cls: number | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      source: row.source,
      path: row.path,
      device: row.device,
      lcp_ms: row.lcpMs,
      inp_ms: row.inpMs,
      cls: row.cls,
      created_at: row.createdAt.toISOString(),
    };
  }

  private mapExperiment(row: {
    id: string;
    code: string;
    name: string;
    status: string;
    metric: string;
    variants: unknown;
    startedAt: Date | null;
    endedAt: Date | null;
  }) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      status: row.status,
      metric: row.metric,
      variants: row.variants,
      started_at: row.startedAt?.toISOString() ?? null,
      ended_at: row.endedAt?.toISOString() ?? null,
    };
  }

  private mapAi(row: {
    id: string;
    kind: string;
    risk: string;
    status: string;
    input: unknown;
    output: unknown;
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
      requested_by: row.requestedBy,
      reviewed_by: row.reviewedBy,
      review_note: row.reviewNote,
      created_at: row.createdAt.toISOString(),
    };
  }
}
