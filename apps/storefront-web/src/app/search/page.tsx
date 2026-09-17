'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { StoreShell } from '../../components/StoreShell';
import { formatVnd, searchProducts, type Product } from '../../lib/api';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Product[]>([]);
  const [meta, setMeta] = useState<{
    source: string;
    latency_ms: number;
    within_slo?: boolean;
  } | null>(null);
  const [pending, start] = useTransition();

  function search() {
    start(async () => {
      const res = await searchProducts({ q, sort: 'newest' });
      setItems(res.items);
      setMeta(res.meta);
    });
  }

  return (
    <StoreShell>
      <div style={{ padding: 16 }}>
        <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 26 }}>Tìm kiếm</h1>
        <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Serum, dưỡng ẩm…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') search();
            }}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 8,
              border: '1px solid #ddd',
              padding: '0 12px',
            }}
          />
          <button
            type="button"
            onClick={search}
            disabled={pending}
            style={{
              height: 44,
              padding: '0 14px',
              borderRadius: 8,
              border: 'none',
              background: '#c45a6a',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {pending ? '…' : 'Tìm'}
          </button>
        </div>
        {meta ? (
          <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 8 }}>
            {meta.source} · {meta.latency_ms}ms
            {meta.within_slo === false ? ' · chậm vs SLO' : ''}
          </p>
        ) : null}
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              style={{
                padding: 12,
                background: '#fff',
                borderRadius: 10,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              {p.title} — {formatVnd(p.skus[0]?.unit_price)}
            </Link>
          ))}
        </div>
      </div>
    </StoreShell>
  );
}
