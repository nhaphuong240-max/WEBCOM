import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export type ChStorefrontEvent = {
  event_id: string;
  tenant_id: string;
  storefront_id: string;
  name: string;
  session_id: string;
  customer_id: string;
  landing_path: string;
  consent_state: string;
  experiment_id: string;
  variant_key: string;
  payload_json: string;
  ts: string; // ISO
};

function featureCh() {
  const v = process.env.FEATURE_CLICKHOUSE;
  if (v === undefined || v === '') return true;
  return v === '1' || v.toLowerCase() === 'true';
}

/**
 * ClickHouse analytics warehouse.
 * - Live: HTTP interface when CLICKHOUSE_URL is set
 * - Stub: in-process rows (default for local/VPS without CH cluster)
 */
@Injectable()
export class ClickHouseClient implements OnModuleInit {
  private readonly log = new Logger(ClickHouseClient.name);
  private readonly stubRows: ChStorefrontEvent[] = [];
  private mode: 'live' | 'stub' = 'stub';
  private ready = false;

  onModuleInit() {
    if (!featureCh()) {
      this.ready = false;
      return;
    }
    const url = process.env.CLICKHOUSE_URL?.trim();
    this.mode = url ? 'live' : 'stub';
    this.ready = true;
    if (this.mode === 'live') {
      void this.ensureSchema().catch((e) =>
        this.log.warn(`ClickHouse schema ensure failed, falling back to stub: ${e}`),
      );
    }
    this.log.log(`ClickHouse sink mode=${this.mode}`);
  }

  status() {
    return {
      enabled: featureCh(),
      ready: this.ready,
      mode: this.mode,
      stub_rows: this.stubRows.length,
      url: process.env.CLICKHOUSE_URL ? '[set]' : null,
    };
  }

  private baseUrl() {
    return (process.env.CLICKHOUSE_URL || 'http://127.0.0.1:8123').replace(/\/$/, '');
  }

  private authHeader(): Record<string, string> {
    const user = process.env.CLICKHOUSE_USER || 'default';
    const pass = process.env.CLICKHOUSE_PASSWORD || '';
    if (!pass && user === 'default') return {};
    return { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` };
  }

  private async query(sql: string, body?: string) {
    const url = `${this.baseUrl()}/?database=${encodeURIComponent(process.env.CLICKHOUSE_DB || 'webcom')}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...this.authHeader(),
      },
      body: body ? `${sql}\n${body}` : sql,
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(8000) : undefined,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`CH ${res.status}: ${t.slice(0, 200)}`);
    }
    return res.text();
  }

  async ensureSchema() {
    if (this.mode !== 'live') return;
    try {
      await this.query(`CREATE DATABASE IF NOT EXISTS ${process.env.CLICKHOUSE_DB || 'webcom'}`);
      await this.query(`
CREATE TABLE IF NOT EXISTS storefront_events (
  event_id String,
  tenant_id String,
  storefront_id String,
  name LowCardinality(String),
  session_id String,
  customer_id String,
  landing_path String,
  consent_state LowCardinality(String),
  experiment_id String,
  variant_key String,
  payload_json String,
  ts DateTime64(3, 'UTC')
) ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (tenant_id, storefront_id, name, ts, event_id)
TTL ts + toIntervalDay(${Number(process.env.ANALYTICS_RETENTION_DAYS || 90)})
`);
      this.mode = 'live';
      this.ready = true;
    } catch (e) {
      this.mode = 'stub';
      this.ready = true;
      this.log.warn(String(e));
    }
  }

  async insert(row: ChStorefrontEvent) {
    if (!this.ready) return { ok: false, mode: 'off' as const };
    if (this.mode === 'stub') {
      if (!this.stubRows.some((r) => r.event_id === row.event_id)) {
        this.stubRows.push(row);
      }
      this.pruneStub();
      return { ok: true, mode: 'stub' as const };
    }
    try {
      const line = JSON.stringify({
        ...row,
        ts: row.ts.replace('T', ' ').replace('Z', ''),
      });
      await this.query('INSERT INTO storefront_events FORMAT JSONEachRow', line);
      return { ok: true, mode: 'live' as const };
    } catch (e) {
      this.log.warn(`CH insert failed, stub fallback: ${e}`);
      this.stubRows.push(row);
      this.pruneStub();
      this.mode = 'stub';
      return { ok: true, mode: 'stub' as const };
    }
  }

  private pruneStub() {
    const days = Number(process.env.ANALYTICS_RETENTION_DAYS || 90);
    const cut = Date.now() - days * 86400000;
    while (this.stubRows.length && new Date(this.stubRows[0].ts).getTime() < cut) {
      this.stubRows.shift();
    }
    // Cap memory for long-running stub
    if (this.stubRows.length > 50_000) this.stubRows.splice(0, this.stubRows.length - 50_000);
  }

  async funnel(
    tenantId: string,
    storefrontId: string,
    sinceIso: string,
    steps: readonly string[],
  ): Promise<Array<{ step: string; count: number; unique_sessions: number }> | null> {
    if (!this.ready) return null;
    const rows = await this.loadEvents(tenantId, storefrontId, sinceIso);
    if (!rows) return null;
    return steps.map((step) => {
      const matched = rows.filter((r) => r.name === step);
      const sessions = new Set(matched.map((r) => r.session_id).filter(Boolean));
      return {
        step,
        count: matched.length,
        unique_sessions: sessions.size || matched.length,
      };
    });
  }

  async eventsForLanding(
    tenantId: string,
    storefrontId: string,
    sinceIso: string,
  ): Promise<Array<{ name: string; session_id: string; landing_path: string; payload_json: string }> | null> {
    if (!this.ready) return null;
    const rows = await this.loadEvents(tenantId, storefrontId, sinceIso);
    if (!rows) return null;
    return rows.map((r) => ({
      name: r.name,
      session_id: r.session_id,
      landing_path: r.landing_path || '/',
      payload_json: r.payload_json || '{}',
    }));
  }

  async countSince(tenantId: string, storefrontId: string, sinceIso: string): Promise<number | null> {
    if (!this.ready) return null;
    const rows = await this.loadEvents(tenantId, storefrontId, sinceIso);
    return rows ? rows.length : null;
  }

  private async loadEvents(
    tenantId: string,
    storefrontId: string,
    sinceIso: string,
  ): Promise<ChStorefrontEvent[] | null> {
    if (this.mode === 'stub') {
      const since = new Date(sinceIso).getTime();
      return this.stubRows.filter(
        (r) =>
          r.tenant_id === tenantId &&
          r.storefront_id === storefrontId &&
          new Date(r.ts).getTime() >= since,
      );
    }
    try {
      const ts = sinceIso.replace('T', ' ').replace('Z', '');
      const sql = `SELECT event_id, tenant_id, storefront_id, name, session_id, customer_id, landing_path, consent_state, experiment_id, variant_key, payload_json, toString(ts) AS ts
FROM storefront_events
WHERE tenant_id = '${tenantId.replace(/'/g, '')}'
  AND storefront_id = '${storefrontId.replace(/'/g, '')}'
  AND ts >= parseDateTimeBestEffort('${ts}')
FORMAT JSON`;
      const text = await this.query(sql);
      const parsed = JSON.parse(text) as { data?: ChStorefrontEvent[] };
      return parsed.data || [];
    } catch (e) {
      this.log.warn(`CH query failed: ${e}`);
      return null;
    }
  }
}
