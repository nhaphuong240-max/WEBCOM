import { Injectable } from '@nestjs/common';
import { createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

function money(n: Prisma.Decimal | number | string) {
  return Number(new Prisma.Decimal(n).toFixed(2));
}

function daysSince(d: Date | null, now: Date) {
  if (!d) return 9999;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}

/** Map raw metric → 1–5 using fixed business buckets (stub; stable without large N). */
function scoreRecency(days: number): number {
  if (days <= 30) return 5;
  if (days <= 60) return 4;
  if (days <= 90) return 3;
  if (days <= 180) return 2;
  return 1;
}

function scoreFrequency(orders: number): number {
  if (orders >= 10) return 5;
  if (orders >= 5) return 4;
  if (orders >= 3) return 3;
  if (orders >= 2) return 2;
  if (orders >= 1) return 1;
  return 1;
}

function scoreMonetary(spend: number): number {
  if (spend >= 5_000_000) return 5;
  if (spend >= 2_000_000) return 4;
  if (spend >= 1_000_000) return 3;
  if (spend >= 300_000) return 2;
  return 1;
}

function labelRfm(r: number, f: number, m: number): string {
  if (r >= 4 && f >= 4 && m >= 4) return 'Champions';
  if (r >= 3 && f >= 4) return 'Loyal';
  if (r >= 4 && f <= 2 && m >= 3) return 'Potential';
  if (r >= 4 && f === 1) return 'New';
  if (r <= 2 && f >= 3) return 'AtRisk';
  if (r === 3 && f >= 2 && f <= 3) return 'NeedAttention';
  if (r <= 2 && f <= 2) return 'Hibernating';
  return 'Other';
}

@Injectable()
export class CrmRfmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async refresh(tenantId: string, actorId?: string) {
    const startedAt = new Date();
    const customers = await this.prisma.db.customer.findMany({
      where: { tenantId, status: { not: 'merged' } },
      select: {
        id: true,
        lifetimeOrders: true,
        lifetimeSpend: true,
        lastOrderAt: true,
      },
    });

    const now = new Date();
    const summary: Record<string, number> = {};
    let scored = 0;

    for (const c of customers) {
      const r = scoreRecency(daysSince(c.lastOrderAt, now));
      const f = scoreFrequency(c.lifetimeOrders);
      const m = scoreMonetary(money(c.lifetimeSpend));
      const score = r * 100 + f * 10 + m;
      const segment = labelRfm(r, f, m);
      summary[segment] = (summary[segment] || 0) + 1;
      await this.prisma.db.customer.update({
        where: { id: c.id },
        data: {
          rfmR: r,
          rfmF: f,
          rfmM: m,
          rfmScore: score,
          rfmSegment: segment,
          rfmComputedAt: now,
        },
      });
      scored += 1;
    }

    const run = await this.prisma.db.rfmJobRun.create({
      data: {
        id: createId('rfm'),
        tenantId,
        status: 'completed',
        customersScored: scored,
        summary: summary as Prisma.InputJsonValue,
        startedAt,
        finishedAt: new Date(),
      },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'crm.rfm_refresh',
      entity: 'rfm_job_run',
      entityId: run.id,
      payload: { customers_scored: scored, summary },
    });

    return {
      job_id: run.id,
      customers_scored: scored,
      summary,
      started_at: startedAt.toISOString(),
      finished_at: run.finishedAt!.toISOString(),
    };
  }

  async summary(tenantId: string) {
    const rows = await this.prisma.db.customer.groupBy({
      by: ['rfmSegment'],
      where: { tenantId, status: { not: 'merged' }, rfmSegment: { not: null } },
      _count: { id: true },
    });
    const bySegment: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      const key = r.rfmSegment || 'Other';
      bySegment[key] = r._count.id;
      total += r._count.id;
    }
    const last = await this.prisma.db.rfmJobRun.findFirst({
      where: { tenantId },
      orderBy: { startedAt: 'desc' },
    });
    return {
      total_scored: total,
      by_segment: bySegment,
      last_job: last
        ? {
            id: last.id,
            customers_scored: last.customersScored,
            summary: last.summary,
            started_at: last.startedAt.toISOString(),
            finished_at: last.finishedAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  async listBySegment(tenantId: string, segment?: string, limit = 50) {
    const rows = await this.prisma.db.customer.findMany({
      where: {
        tenantId,
        status: { not: 'merged' },
        ...(segment ? { rfmSegment: segment } : { rfmSegment: { not: null } }),
      },
      orderBy: [{ rfmScore: 'desc' }, { lifetimeSpend: 'desc' }],
      take: Math.min(Math.max(limit, 1), 100),
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      rfm: {
        r: r.rfmR,
        f: r.rfmF,
        m: r.rfmM,
        score: r.rfmScore,
        segment: r.rfmSegment,
        computed_at: r.rfmComputedAt?.toISOString() ?? null,
      },
      lifetime_orders: r.lifetimeOrders,
      lifetime_spend: money(r.lifetimeSpend).toFixed(2),
      last_order_at: r.lastOrderAt?.toISOString() ?? null,
    }));
  }

  async listJobs(tenantId: string, limit = 20) {
    const rows = await this.prisma.db.rfmJobRun.findMany({
      where: { tenantId },
      orderBy: { startedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      customers_scored: r.customersScored,
      summary: r.summary,
      started_at: r.startedAt.toISOString(),
      finished_at: r.finishedAt?.toISOString() ?? null,
    }));
  }
}
