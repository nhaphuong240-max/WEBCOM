'use client';

import { useState, useTransition } from 'react';
import { CatalogPicker } from '../builder/CatalogPicker';

export type MegaNavItem = {
  label: string;
  href: string;
  mega?: {
    columns?: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
    featured_collections?: Array<{ slug: string; title: string }>;
    featured_products?: Array<{ id?: string; slug: string; title: string; image?: string }>;
  };
};

type Hit = { id: string; title: string; slug?: string; image?: string };

export function MegaNavEditor({
  initialItems,
  saveAction,
  searchCatalogAction,
}: {
  initialItems: MegaNavItem[];
  saveAction: (items: MegaNavItem[]) => Promise<MegaNavItem[]>;
  searchCatalogAction: (mode: 'products' | 'collection', q: string) => Promise<Hit[]>;
}) {
  const [items, setItems] = useState<MegaNavItem[]>(() =>
    JSON.parse(JSON.stringify(initialItems)) as MegaNavItem[],
  );
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState('');
  const [pending, start] = useTransition();

  const current = items[selected];

  function updateCurrent(patch: Partial<MegaNavItem>) {
    setItems((prev) =>
      prev.map((it, i) => (i === selected ? { ...it, ...patch } : it)),
    );
  }

  function ensureMega(): NonNullable<MegaNavItem['mega']> {
    return (
      current?.mega || {
        columns: [],
        featured_collections: [],
        featured_products: [],
      }
    );
  }

  function save() {
    start(async () => {
      try {
        const cleaned = items.map((it) => {
          const mega = it.mega;
          if (!mega) return { label: it.label, href: it.href };
          const has =
            (mega.columns && mega.columns.length > 0) ||
            (mega.featured_collections && mega.featured_collections.length > 0) ||
            (mega.featured_products && mega.featured_products.length > 0);
          if (!has) return { label: it.label, href: it.href };
          return { label: it.label, href: it.href, mega };
        });
        const next = await saveAction(cleaned);
        setItems(next);
        setStatus('Đã lưu header nav');
      } catch (e) {
        setStatus(e instanceof Error ? e.message : 'Lưu lỗi');
      }
    });
  }

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '220px 1fr' }}>
      <aside style={{ borderRight: '1px solid var(--ptt-line)', paddingRight: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, marginBottom: 8 }}>MỤC MENU</div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((it, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: 8,
                  background: i === selected ? 'var(--ptt-accent-soft)' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {it.label}
                {it.mega ? ' · mega' : ''}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setItems((p) => [...p, { label: 'Mục mới', href: '/collections/moi' }]);
            setSelected(items.length);
          }}
          style={{
            marginTop: 10,
            width: '100%',
            height: 36,
            borderRadius: 8,
            border: '1px dashed var(--ptt-line)',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          + Thêm mục
        </button>
      </aside>

      <div style={{ display: 'grid', gap: 12 }}>
        {current ? (
          <>
            <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
              Label
              <input
                value={current.label}
                onChange={(e) => updateCurrent({ label: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
              Href
              <input
                value={current.href}
                onChange={(e) => updateCurrent({ href: e.target.value })}
                style={inputStyle}
              />
            </label>

            <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={!!current.mega}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateCurrent({
                      mega: {
                        columns: [
                          {
                            title: 'Danh mục',
                            links: [{ label: current.label, href: current.href }],
                          },
                        ],
                        featured_collections: [],
                        featured_products: [],
                      },
                    });
                  } else {
                    updateCurrent({ mega: undefined });
                  }
                }}
              />
              Bật mega menu merch
            </label>

            {current.mega ? (
              <>
                <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
                  Columns (JSON: title + links)
                  <textarea
                    rows={6}
                    value={JSON.stringify(current.mega.columns || [], null, 2)}
                    onChange={(e) => {
                      try {
                        const columns = JSON.parse(e.target.value) as NonNullable<
                          MegaNavItem['mega']
                        >['columns'];
                        updateCurrent({ mega: { ...ensureMega(), columns } });
                      } catch {
                        /* ignore while typing */
                      }
                    }}
                    style={{ ...inputStyle, height: 'auto', padding: 8, fontFamily: 'monospace' }}
                  />
                </label>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Featured collections
                  </div>
                  <CatalogPicker
                    mode="collection"
                    value={(current.mega.featured_collections || []).map((c) => c.slug)}
                    onChange={(next) => {
                      const slugs = Array.isArray(next) ? next : next ? [next] : [];
                      const prev = new Map(
                        (current.mega?.featured_collections || []).map((c) => [c.slug, c]),
                      );
                      start(async () => {
                        const hits = await searchCatalogAction('collection', '');
                        const bySlug = new Map(hits.map((h) => [h.slug || h.id, h]));
                        updateCurrent({
                          mega: {
                            ...ensureMega(),
                            featured_collections: slugs.map((slug) => ({
                              slug,
                              title: prev.get(slug)?.title || bySlug.get(slug)?.title || slug,
                            })),
                          },
                        });
                      });
                    }}
                    searchAction={(q) => searchCatalogAction('collection', q)}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Featured products
                  </div>
                  <CatalogPicker
                    mode="products"
                    value={(current.mega.featured_products || [])
                      .map((p) => p.id || p.slug)
                      .filter(Boolean)}
                    onChange={(next) => {
                      const ids = Array.isArray(next) ? next : next ? [next] : [];
                      const prev = new Map(
                        (current.mega?.featured_products || []).map((p) => [
                          p.id || p.slug,
                          p,
                        ]),
                      );
                      start(async () => {
                        const hits = await searchCatalogAction('products', '');
                        const byId = new Map(hits.map((h) => [h.id, h]));
                        const bySlug = new Map(hits.map((h) => [h.slug || '', h]));
                        updateCurrent({
                          mega: {
                            ...ensureMega(),
                            featured_products: ids.map((id) => {
                              const h = byId.get(id) || bySlug.get(id);
                              const old = prev.get(id);
                              return {
                                id: h?.id || old?.id || id,
                                slug: h?.slug || old?.slug || id,
                                title: h?.title || old?.title || id,
                                image: h?.image || old?.image,
                              };
                            }),
                          },
                        });
                      });
                    }}
                    searchAction={(q) => searchCatalogAction('products', q)}
                  />
                </div>
              </>
            ) : null}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                disabled={pending}
                onClick={save}
                style={{
                  height: 40,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--ptt-accent)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {pending ? 'Đang lưu…' : 'Lưu navigation'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (items.length <= 1) return;
                  setItems((p) => p.filter((_, i) => i !== selected));
                  setSelected(0);
                }}
                style={{
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid var(--ptt-line)',
                  background: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Xóa mục
              </button>
            </div>
            {status ? <p style={{ fontSize: 12, color: 'var(--ptt-muted)', margin: 0 }}>{status}</p> : null}
          </>
        ) : (
          <p>Chọn một mục menu</p>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: '1px solid var(--ptt-line)',
  padding: '0 10px',
  width: '100%',
  boxSizing: 'border-box',
};
