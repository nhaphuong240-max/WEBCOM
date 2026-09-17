import { Injectable } from '@nestjs/common';
import { OpenSearchClient } from './opensearch.client';
import { SearchIndexerService } from './search-indexer.service';

@Injectable()
export class SearchService {
  private readonly latencies: number[] = [];

  constructor(
    private readonly os: OpenSearchClient,
    private readonly indexer: SearchIndexerService,
  ) {}

  status() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p95 =
      sorted.length === 0
        ? null
        : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    return {
      ...this.indexer.status(),
      latency_samples: sorted.length,
      latency_p95_ms: p95,
      slo_p95_ms: Number(process.env.SEARCH_P95_SLO_MS || 200),
      within_slo: p95 == null ? true : p95 <= Number(process.env.SEARCH_P95_SLO_MS || 200),
    };
  }

  /**
   * Resolve product IDs via OpenSearch (stub/live). Returns null → caller uses Postgres.
   */
  async searchIds(input: {
    tenantId: string;
    brandId?: string;
    q?: string;
    collection?: string;
    size?: number;
  }): Promise<{
    ids: string[];
    source: 'opensearch' | 'opensearch_stub';
    mode: 'live' | 'stub';
    latency_ms: number;
  } | null> {
    if (!this.os.status().enabled || !this.os.status().ready) return null;
    // Prefer OS when there is a query or collection filter
    if (!input.q?.trim() && !input.collection?.trim()) return null;

    const hit = await this.os.search(input);
    if (!hit) return null;
    this.recordLatency(hit.took_ms);
    return {
      ids: hit.ids,
      source: hit.mode === 'live' ? 'opensearch' : 'opensearch_stub',
      mode: hit.mode,
      latency_ms: hit.took_ms,
    };
  }

  private recordLatency(ms: number) {
    this.latencies.push(ms);
    if (this.latencies.length > 200) this.latencies.shift();
  }
}
