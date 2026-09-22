'use client';

import { useMemo, useState, type CSSProperties } from 'react';

type Hit = { id: string; title: string; slug?: string; label?: string };

export function CatalogPicker({
  mode,
  value,
  onChange,
  searchAction,
  dark,
}: {
  mode: 'products' | 'collection';
  value: string | string[];
  onChange: (next: string | string[]) => void;
  searchAction: (q: string) => Promise<Hit[]>;
  dark?: boolean;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const selected = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );

  async function runSearch() {
    setBusy(true);
    try {
      const rows = await searchAction(q.trim());
      setHits(rows);
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: CSSProperties = dark
    ? {
        height: 32,
        borderRadius: 6,
        border: '1px solid #3a4656',
        background: '#151c26',
        color: '#e8eef7',
        padding: '0 8px',
        width: '100%',
      }
    : {
        height: 32,
        borderRadius: 6,
        border: '1px solid #ccc',
        padding: '0 8px',
        width: '100%',
      };

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void runSearch();
            }
          }}
          placeholder={mode === 'products' ? 'Tìm sản phẩm…' : 'Tìm collection slug…'}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={busy}
          style={{
            height: 32,
            padding: '0 10px',
            borderRadius: 6,
            border: 'none',
            background: '#3d6bf3',
            color: '#fff',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {busy ? '…' : 'Tìm'}
        </button>
      </div>
      {selected.length ? (
        <div style={{ fontSize: 11, opacity: 0.75 }}>
          Đã chọn: {selected.join(', ')}{' '}
          <button
            type="button"
            style={{ border: 'none', background: 'transparent', color: '#f88', cursor: 'pointer' }}
            onClick={() => onChange(mode === 'products' || Array.isArray(value) ? [] : '')}
          >
            xóa
          </button>
        </div>
      ) : null}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 140, overflow: 'auto' }}>
        {hits.map((h) => {
          const id = mode === 'collection' ? h.slug || h.id : h.id;
          const active = selected.includes(id);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  if (mode === 'collection') {
                    if (Array.isArray(value)) {
                      const next = active ? selected.filter((x) => x !== id) : [...selected, id];
                      onChange(next);
                      return;
                    }
                    onChange(id);
                    return;
                  }
                  const next = active ? selected.filter((x) => x !== id) : [...selected, id];
                  onChange(next);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 8px',
                  border: 'none',
                  background: active ? '#243041' : 'transparent',
                  color: dark ? '#e8eef7' : 'inherit',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {active ? '✓ ' : ''}
                {h.title || h.label || id}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
