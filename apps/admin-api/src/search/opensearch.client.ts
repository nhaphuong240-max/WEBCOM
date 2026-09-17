import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export type ProductSearchDoc = {
  product_id: string;
  tenant_id: string;
  brand_id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  collection_tags: string[];
  min_price: number;
  updated_at: string;
};

function featureOs() {
  const v = process.env.FEATURE_OPENSEARCH;
  if (v === undefined || v === '') return true;
  return v === '1' || v.toLowerCase() === 'true';
}

/**
 * OpenSearch product index.
 * - Live: OPENSEARCH_URL HTTP (_bulk / _search)
 * - Stub: in-process Map (default local/VPS without cluster)
 */
@Injectable()
export class OpenSearchClient implements OnModuleInit {
  private readonly log = new Logger(OpenSearchClient.name);
  private readonly stub = new Map<string, ProductSearchDoc>();
  private mode: 'live' | 'stub' = 'stub';
  private ready = false;
  private liveOk = true;

  onModuleInit() {
    if (!featureOs()) {
      this.ready = false;
      return;
    }
    this.mode = process.env.OPENSEARCH_URL?.trim() ? 'live' : 'stub';
    this.ready = true;
    if (this.mode === 'live') {
      void this.ensureIndex().catch((e) => {
        this.log.warn(`OpenSearch ensureIndex failed → stub: ${e}`);
        this.mode = 'stub';
        this.liveOk = false;
      });
    }
    this.log.log(`OpenSearch mode=${this.mode} index=${this.indexName()}`);
  }

  status() {
    return {
      enabled: featureOs(),
      ready: this.ready,
      mode: this.mode,
      live_ok: this.liveOk,
      index: this.indexName(),
      stub_docs: this.stub.size,
      url: process.env.OPENSEARCH_URL ? '[set]' : null,
    };
  }

  indexName() {
    return process.env.OPENSEARCH_INDEX_PRODUCTS || 'webcom-products';
  }

  private baseUrl() {
    return (process.env.OPENSEARCH_URL || 'http://127.0.0.1:9200').replace(/\/$/, '');
  }

  private authHeader(): Record<string, string> {
    const user = process.env.OPENSEARCH_USER;
    const pass = process.env.OPENSEARCH_PASSWORD;
    if (!user) return {};
    return { Authorization: `Basic ${Buffer.from(`${user}:${pass || ''}`).toString('base64')}` };
  }

  private async http(path: string, init?: RequestInit) {
    const res = await fetch(`${this.baseUrl()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader(),
        ...(init?.headers || {}),
      },
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(4000) : undefined,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`OS ${res.status}: ${t.slice(0, 200)}`);
    }
    return res;
  }

  async ensureIndex() {
    if (this.mode !== 'live') return;
    try {
      const head = await fetch(`${this.baseUrl()}/${this.indexName()}`, {
        method: 'HEAD',
        headers: this.authHeader(),
        signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(3000) : undefined,
      });
      if (head.status === 404) {
        await this.http(`/${this.indexName()}`, {
          method: 'PUT',
          body: JSON.stringify({
            settings: { number_of_shards: 1, number_of_replicas: 0 },
            mappings: {
              properties: {
                product_id: { type: 'keyword' },
                tenant_id: { type: 'keyword' },
                brand_id: { type: 'keyword' },
                title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                slug: { type: 'keyword' },
                description: { type: 'text' },
                status: { type: 'keyword' },
                collection_tags: { type: 'keyword' },
                min_price: { type: 'double' },
                updated_at: { type: 'date' },
              },
            },
          }),
        });
      }
      this.liveOk = true;
      this.mode = 'live';
    } catch (e) {
      this.liveOk = false;
      this.mode = 'stub';
      throw e;
    }
  }

  docKey(tenantId: string, productId: string) {
    return `${tenantId}:${productId}`;
  }

  async index(doc: ProductSearchDoc) {
    if (!this.ready) return { ok: false, mode: 'off' as const };
    if (this.mode === 'stub' || !this.liveOk) {
      this.stub.set(this.docKey(doc.tenant_id, doc.product_id), doc);
      return { ok: true, mode: 'stub' as const };
    }
    try {
      await this.http(`/${this.indexName()}/_doc/${encodeURIComponent(doc.product_id)}`, {
        method: 'PUT',
        body: JSON.stringify(doc),
      });
      // Mirror into stub for hybrid reads if needed
      this.stub.set(this.docKey(doc.tenant_id, doc.product_id), doc);
      return { ok: true, mode: 'live' as const };
    } catch (e) {
      this.log.warn(`OS index soft-fail → stub: ${e}`);
      this.liveOk = false;
      this.mode = 'stub';
      this.stub.set(this.docKey(doc.tenant_id, doc.product_id), doc);
      return { ok: true, mode: 'stub' as const };
    }
  }

  async remove(tenantId: string, productId: string) {
    if (!this.ready) return;
    this.stub.delete(this.docKey(tenantId, productId));
    if (this.mode === 'live' && this.liveOk) {
      try {
        await this.http(`/${this.indexName()}/_doc/${encodeURIComponent(productId)}`, {
          method: 'DELETE',
        });
      } catch {
        /* ignore */
      }
    }
  }

  async search(input: {
    tenantId: string;
    brandId?: string;
    q?: string;
    collection?: string;
    size?: number;
  }): Promise<{ ids: string[]; mode: 'live' | 'stub'; took_ms: number } | null> {
    if (!this.ready) return null;
    const t0 = Date.now();
    if (this.mode === 'live' && this.liveOk) {
      try {
        const must: unknown[] = [{ term: { tenant_id: input.tenantId } }, { term: { status: 'active' } }];
        if (input.brandId) must.push({ term: { brand_id: input.brandId } });
        if (input.collection) {
          must.push({ term: { collection_tags: input.collection.toLowerCase() } });
        }
        const query = input.q?.trim()
          ? {
              bool: {
                must,
                should: [
                  {
                    multi_match: {
                      query: input.q,
                      fields: ['title^3', 'description', 'slug^2'],
                      fuzziness: 'AUTO',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            }
          : { bool: { must } };

        const res = await this.http(`/${this.indexName()}/_search`, {
          method: 'POST',
          body: JSON.stringify({
            size: input.size ?? 50,
            query,
            sort: input.q ? ['_score'] : [{ updated_at: 'desc' }],
          }),
        });
        const body = (await res.json()) as {
          hits?: { hits?: Array<{ _source?: { product_id?: string } }> };
        };
        const ids = (body.hits?.hits || [])
          .map((h) => h._source?.product_id)
          .filter((id): id is string => !!id);
        return { ids, mode: 'live', took_ms: Date.now() - t0 };
      } catch (e) {
        this.log.warn(`OS search failed → stub: ${e}`);
        this.liveOk = false;
        this.mode = 'stub';
      }
    }
    return { ids: this.stubSearch(input), mode: 'stub', took_ms: Date.now() - t0 };
  }

  private stubSearch(input: {
    tenantId: string;
    brandId?: string;
    q?: string;
    collection?: string;
    size?: number;
  }): string[] {
    const q = (input.q || '').trim().toLowerCase();
    const col = (input.collection || '').trim().toLowerCase();
    const scored: Array<{ id: string; score: number; updated: string }> = [];
    for (const doc of this.stub.values()) {
      if (doc.tenant_id !== input.tenantId) continue;
      if (doc.status !== 'active') continue;
      if (input.brandId && doc.brand_id !== input.brandId) continue;
      if (col && !doc.collection_tags.some((t) => t.includes(col) || col.includes(t))) continue;
      let score = 1;
      if (q) {
        const title = doc.title.toLowerCase();
        const desc = doc.description.toLowerCase();
        const slug = doc.slug.toLowerCase();
        if (title === q) score = 100;
        else if (title.includes(q)) score = 80;
        else if (slug.includes(q)) score = 60;
        else if (desc.includes(q)) score = 40;
        else if (this.fuzzy(title, q) || this.fuzzy(slug, q)) score = 25;
        else continue;
        // typo/synonym light: glow↔serum boost if both present in corpus query
        if (q.includes('serum') && title.includes('glow')) score += 5;
      }
      scored.push({ id: doc.product_id, score, updated: doc.updated_at });
    }
    scored.sort((a, b) => b.score - a.score || b.updated.localeCompare(a.updated));
    return scored.slice(0, input.size ?? 50).map((s) => s.id);
  }

  private fuzzy(hay: string, needle: string) {
    if (!needle || needle.length < 3) return false;
    // simple: allow 1 char difference via includes of prefix/suffix
    if (hay.includes(needle.slice(0, -1))) return true;
    if (needle.length > 3 && hay.includes(needle.slice(1))) return true;
    return false;
  }
}
