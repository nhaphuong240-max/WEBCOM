import { Injectable } from '@nestjs/common';
import type { ChStorefrontEvent } from './clickhouse.client';
import { ClickHouseClient } from './clickhouse.client';
import { RedpandaClient } from './redpanda.client';

export type SinkResult = {
  sinks: string[];
  redpanda?: { ok: boolean; mode: string };
  clickhouse_via?: 'redpanda' | 'direct' | 'none';
};

/**
 * Dual-write contract: Postgres (caller) + Redpanda → ClickHouse.
 * If Redpanda disabled, optionally direct-insert CH (FEATURE_CH_DIRECT_FALLBACK).
 */
@Injectable()
export class EventSinkService {
  constructor(
    private readonly redpanda: RedpandaClient,
    private readonly ch: ClickHouseClient,
  ) {}

  pipelineStatus() {
    return {
      redpanda: this.redpanda.status(),
      clickhouse: this.ch.status(),
      path: 'postgres → redpanda → clickhouse',
      retention_days: Number(process.env.ANALYTICS_RETENTION_DAYS || 90),
    };
  }

  async afterPostgresWrite(row: {
    id: string;
    tenantId: string;
    storefrontId: string;
    name: string;
    sessionId: string | null;
    customerId: string | null;
    landingPath: string | null;
    consentState: string | null;
    experimentId: string | null;
    variantKey: string | null;
    payload: unknown;
    createdAt: Date;
  }): Promise<SinkResult> {
    const event: ChStorefrontEvent = {
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
    };

    const sinks = ['postgres'];
    const rp = await this.redpanda.produce(event);
    if (rp.ok) {
      sinks.push('redpanda');
      // Ensure near-realtime CH for dashboard reads in same request (e2e)
      await this.redpanda.flush(500);
      return { sinks, redpanda: rp, clickhouse_via: 'redpanda' };
    }

    const direct =
      process.env.FEATURE_CH_DIRECT_FALLBACK === '1' ||
      process.env.FEATURE_CH_DIRECT_FALLBACK === 'true' ||
      process.env.FEATURE_CH_DIRECT_FALLBACK === undefined;
    if (direct) {
      const ins = await this.ch.insert(event);
      if (ins.ok) {
        sinks.push('clickhouse');
        return { sinks, redpanda: rp, clickhouse_via: 'direct' };
      }
    }
    return { sinks, redpanda: rp, clickhouse_via: 'none' };
  }
}
