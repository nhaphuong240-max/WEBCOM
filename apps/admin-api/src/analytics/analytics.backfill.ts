import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClickHouseClient } from './clickhouse.client';
import { RedpandaClient } from './redpanda.client';

/**
 * One-shot dual-write backfill so CH funnel coverage can reach ≥95% after A3 deploy
 * when Postgres already holds historical StorefrontEvent rows.
 */
@Injectable()
export class AnalyticsBackfill implements OnModuleInit {
  private readonly log = new Logger(AnalyticsBackfill.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ch: ClickHouseClient,
    private readonly redpanda: RedpandaClient,
  ) {}

  async onModuleInit() {
    const raw = process.env.FEATURE_ANALYTICS_BACKFILL;
    const enabled = raw === undefined || raw === '' || raw === '1' || raw === 'true';
    if (!enabled) return;

    try {
      const days = Number(process.env.ANALYTICS_BACKFILL_DAYS || 7);
      const since = new Date(Date.now() - days * 86400000);
      const limit = Number(process.env.ANALYTICS_BACKFILL_LIMIT || 5000);
      const rows = await this.prisma.db.storefrontEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });
      if (!rows.length) return;

      // Skip if CH already roughly caught up for first storefront sample
      const sample = rows[0];
      const existing = await this.ch.countSince(sample.tenantId, sample.storefrontId, since.toISOString());
      const pgForSf = rows.filter(
        (r) => r.tenantId === sample.tenantId && r.storefrontId === sample.storefrontId,
      ).length;
      if (existing != null && pgForSf > 0 && existing / pgForSf >= 0.95) {
        this.log.log(`Analytics backfill skip — CH coverage already ${(existing / pgForSf) * 100}%`);
        return;
      }

      let n = 0;
      for (const row of rows) {
        await this.redpanda.produce({
          event_id: row.id,
          tenant_id: row.tenantId,
          storefront_id: row.storefrontId,
          name: row.name,
          session_id: row.sessionId || '',
          customer_id: row.customerId || '',
          landing_path: row.landingPath || '/',
          consent_state: row.consentState || 'unknown',
          experiment_id: row.experimentId || '',
          variant_key: row.variantKey || '',
          payload_json: JSON.stringify(row.payload ?? {}),
          ts: row.createdAt.toISOString(),
        });
        n += 1;
      }
      await this.redpanda.flush(10_000);
      this.log.log(`Analytics backfill dual-wrote ${n} events (last ${days}d)`);
    } catch (e) {
      this.log.warn(`Analytics backfill soft-fail: ${e}`);
    }
  }
}
