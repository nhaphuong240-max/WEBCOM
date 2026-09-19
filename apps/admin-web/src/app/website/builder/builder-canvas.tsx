'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from 'react';

export type SectionNode = {
  type: string;
  id: string;
  props: Record<string, unknown>;
  style: Record<string, unknown>;
};

export type ContentV1 = {
  schema_version: 1;
  section_order: string[];
  sections: Record<string, SectionNode>;
};

type SectionDef = { key: string; label: string; fields: string[] };

type MediaItem = { id: string; url: string; alt: string };

type NavItem = { label: string; href: string };

type SavedBlock = {
  id: string;
  name: string;
  section_type: string;
  content: SectionNode;
};

const VIEWPORTS = {
  desktop: 1100,
  tablet: 768,
  mobile: 390,
} as const;

function defaultProps(type: string): Record<string, unknown> {
  switch (type) {
    case 'hero':
      return { eyebrow: '', headline: 'Headline mới', cta: 'Mua ngay', cta_href: '/' };
    case 'trust':
      return { items: ['Badge mới'] };
    case 'rich_text':
      return { title: 'Tiêu đề', body: '' };
    case 'faq':
      return { items: [{ q: 'Câu hỏi?', a: 'Trả lời' }] };
    case 'cta_banner':
      return { title: 'CTA', cta: 'Go', cta_href: '/' };
    case 'countdown':
      return { label: 'Kết thúc', ends_at: new Date(Date.now() + 86400000).toISOString() };
    case 'footer_links':
      return {
        columns: [{ title: 'Shop', links: [{ label: 'Home', href: '/' }] }],
      };
    case 'footer':
      return { from_brand_kit: true };
    case 'collections':
      return { source: 'theme' };
    case 'featured':
      return { limit: 8 };
    case 'announcement':
      return { text: 'Thông báo mới', href: '/', dismissible: true };
    case 'testimonial':
      return { items: [{ quote: 'Rất hài lòng', author: 'Khách hàng', role: '' }] };
    case 'video':
      return { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', caption: '' };
    case 'product_grid':
      return { limit: 8, sort: 'manual', columns: 2 };
    case 'announce_bar':
      return {
        text: 'Thông báo mới',
        cta_label: 'Xem',
        href: '/',
        cta_code: 'cta_templates',
        tone: 'info',
        ends_at: null,
      };
    case 'platform_hero':
      return {
        headline: 'Headline GTM',
        sub: 'Mô tả ngắn',
        primary_cta: { label: 'Xem templates', href: '/templates', cta_code: 'cta_templates' },
        search_enabled: false,
      };
    case 'social_proof':
      return { items: [{ n: '30+', label: 'Themes' }] };
    case 'module_grid':
      return {
        items: [{ title: 'Module', body: 'Mô tả', href: '/templates', icon: 'cart' }],
      };
    case 'industry_strip':
      return {
        items: [{ key: 'beauty', label: 'Mỹ phẩm', href: '/templates?industry=beauty', icon: 'beauty' }],
      };
    case 'pricing_table':
      return {
        plans: [
          {
            name: 'Theme',
            price: 'One-time',
            features: ['License'],
            layer: 'theme',
            cta: { label: 'Xem', href: '/templates', cta_code: 'cta_templates' },
          },
        ],
      };
    case 'catalog_intro':
      return { headline: 'Template Marketplace', body: 'Intro catalog' };
    case 'cta_band':
      return {
        headline: 'CTA',
        body: '',
        cta: { label: 'Đặt demo', href: '/#lead', cta_code: 'cta_book_demo' },
      };
    default:
      return {};
  }
}

function cloneContent(c: ContentV1): ContentV1 {
  return JSON.parse(JSON.stringify(c)) as ContentV1;
}

export function BuilderCanvas({
  initialContent,
  initialVersion,
  initialSeo,
  sections,
  supports,
  media,
  headerNav,
  savedBlocks: initialBlocks,
  saveAction,
  createMediaAction,
  saveNavAction,
  saveBlockAction,
  suggestCopyAction,
}: {
  initialContent: ContentV1;
  initialVersion: number;
  initialSeo: { title?: string; description?: string };
  sections: SectionDef[];
  supports: string[];
  media: MediaItem[];
  headerNav: NavItem[];
  savedBlocks: SavedBlock[];
  saveAction: (payload: {
    content: ContentV1;
    seo: { title?: string; description?: string };
    expected_version: number;
  }) => Promise<{ version: number; ok: boolean; error?: string }>;
  createMediaAction: (url: string, alt: string) => Promise<MediaItem>;
  saveNavAction: (items: NavItem[]) => Promise<NavItem[]>;
  saveBlockAction: (input: {
    name: string;
    section_type: string;
    content: SectionNode;
  }) => Promise<SavedBlock>;
  suggestCopyAction: (headline: string) => Promise<{ variants: string[]; draft_only: boolean }>;
}) {
  const [content, setContent] = useState(() => cloneContent(initialContent));
  const [version, setVersion] = useState(initialVersion);
  const [seo, setSeo] = useState(initialSeo);
  const [selected, setSelected] = useState<string | null>(content.section_order[0] || null);
  const [viewport, setViewport] = useState<keyof typeof VIEWPORTS>('mobile');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const [mediaList, setMediaList] = useState(media);
  const [navItems, setNavItems] = useState(headerNav);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [aiVariants, setAiVariants] = useState<string[]>([]);
  const [navDraft, setNavDraft] = useState(
    headerNav.map((i) => `${i.label}|${i.href}`).join('\n') || 'Serum|/search\nSkincare|/search',
  );
  const [pending, startTransition] = useTransition();
  const undoStack = useRef<ContentV1[]>([]);
  const redoStack = useRef<ContentV1[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(version);
  versionRef.current = version;

  const supportSet = useMemo(() => new Set(supports), [supports]);
  const allowAdd = useMemo(() => {
    const global = new Set([
      'rich_text',
      'faq',
      'footer_links',
      'announcement',
      'testimonial',
      'video',
      'product_grid',
    ]);
    return sections.filter((s) => supportSet.has(s.key) || global.has(s.key) || supports.length === 0);
  }, [sections, supportSet, supports.length]);

  const pushUndo = useCallback((prev: ContentV1) => {
    undoStack.current = [...undoStack.current.slice(-19), cloneContent(prev)];
    redoStack.current = [];
  }, []);

  const applyContent = useCallback(
    (next: ContentV1, recordUndo = true) => {
      setContent((prev) => {
        if (recordUndo) pushUndo(prev);
        return next;
      });
    },
    [pushUndo],
  );

  const scheduleSave = useCallback(
    (next: ContentV1, nextSeo = seo) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setStatus('saving');
      saveTimer.current = setTimeout(() => {
        startTransition(async () => {
          try {
            const res = await saveAction({
              content: next,
              seo: nextSeo,
              expected_version: versionRef.current,
            });
            if (!res.ok) {
              setStatus('error');
              setError(res.error || 'Conflict — reload');
              return;
            }
            setVersion(res.version);
            versionRef.current = res.version;
            setStatus('saved');
            setError('');
          } catch (e) {
            setStatus('error');
            setError(e instanceof Error ? e.message : 'Save failed');
          }
        });
      }, 600);
    },
    [saveAction, seo],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const mutate = (fn: (c: ContentV1) => ContentV1) => {
    const next = fn(cloneContent(content));
    applyContent(next);
    scheduleSave(next);
  };

  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(cloneContent(content));
    setContent(prev);
    scheduleSave(prev);
  };

  const redo = () => {
    const n = redoStack.current.pop();
    if (!n) return;
    undoStack.current.push(cloneContent(content));
    setContent(n);
    scheduleSave(n);
  };

  const addSection = (type: string) => {
    const key = `${type}_${Date.now().toString(36)}`;
    mutate((c) => {
      c.sections[key] = {
        type,
        id: `sec_${key}`,
        props: defaultProps(type),
        style: {},
      };
      c.section_order.push(key);
      return c;
    });
    setSelected(key);
  };

  const removeSection = (key: string) => {
    mutate((c) => {
      c.section_order = c.section_order.filter((k) => k !== key);
      delete c.sections[key];
      return c;
    });
    setSelected((s) => (s === key ? null : s));
  };

  const move = (key: string, dir: -1 | 1) => {
    mutate((c) => {
      const i = c.section_order.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.section_order.length) return c;
      const tmp = c.section_order[i];
      c.section_order[i] = c.section_order[j];
      c.section_order[j] = tmp;
      return c;
    });
  };

  const selectedNode = selected ? content.sections[selected] : null;

  const updateProp = (field: string, value: unknown) => {
    if (!selected) return;
    mutate((c) => {
      const node = c.sections[selected];
      if (!node) return c;
      node.props = { ...node.props, [field]: value };
      return c;
    });
  };

  const updateStyle = (field: string, value: string) => {
    if (!selected) return;
    mutate((c) => {
      const node = c.sections[selected];
      if (!node) return c;
      node.style = { ...node.style, [field]: value };
      return c;
    });
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          padding: '10px 12px',
          background: '#121820',
          color: '#e8eef5',
          borderRadius: 10,
        }}
      >
        <strong style={{ marginRight: 8 }}>Canvas</strong>
        <span style={{ fontSize: 12, opacity: 0.75 }}>draft v{version}</span>
        <span style={{ fontSize: 12, marginLeft: 8 }}>
          {status === 'saving' || pending ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Error' : 'Idle'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['desktop', 'tablet', 'mobile'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewport(v)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: viewport === v ? '#3d8bfd' : '#1c2530',
                color: '#fff',
                fontSize: 12,
                textTransform: 'capitalize',
              }}
            >
              {v}
            </button>
          ))}
          <button type="button" onClick={undo} style={btnDark}>
            Undo
          </button>
          <button type="button" onClick={redo} style={btnDark}>
            Redo
          </button>
        </div>
      </div>
      {error ? <p style={{ color: 'crimson', fontSize: 13 }}>{error}</p> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px,220px) 1fr minmax(220px,280px)',
          gap: 10,
          minHeight: 520,
        }}
      >
        {/* Layers */}
        <aside style={{ background: '#0f151c', color: '#d7e0ea', borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8 }}>LAYERS</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {content.section_order.map((key) => {
              const node = content.sections[key];
              if (!node) return null;
              const legacy = supports.length > 0 && !supportSet.has(node.type);
              return (
                <li key={key} style={{ marginBottom: 4 }}>
                  <button
                    type="button"
                    onClick={() => setSelected(key)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: selected === key ? '#243041' : 'transparent',
                      color: '#e8eef5',
                      fontSize: 13,
                    }}
                  >
                    {node.type}
                    {legacy ? (
                      <span style={{ marginLeft: 6, fontSize: 10, color: '#f0b429' }}>legacy</span>
                    ) : null}
                  </button>
                  <div style={{ display: 'flex', gap: 4, paddingLeft: 4 }}>
                    <button type="button" style={btnTiny} onClick={() => move(key, -1)}>
                      ↑
                    </button>
                    <button type="button" style={btnTiny} onClick={() => move(key, 1)}>
                      ↓
                    </button>
                    <button type="button" style={btnTiny} onClick={() => removeSection(key)}>
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div style={{ fontSize: 11, opacity: 0.6, margin: '14px 0 6px' }}>ADD BLOCK</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {allowAdd.map((s) => (
              <button key={s.key} type="button" style={btnTiny} onClick={() => addSection(s.key)}>
                + {s.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, margin: '14px 0 6px' }}>SAVED BLOCKS</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {blocks.map((b) => (
              <button
                key={b.id}
                type="button"
                style={{ ...btnTiny, textAlign: 'left', width: '100%' }}
                onClick={() => {
                  const key = `${b.section_type}_${Date.now().toString(36)}`;
                  mutate((c) => {
                    c.sections[key] = {
                      ...b.content,
                      id: `sec_${key}`,
                      type: b.section_type,
                    };
                    c.section_order.push(key);
                    return c;
                  });
                  setSelected(key);
                }}
              >
                ↩ {b.name}
              </button>
            ))}
            {!blocks.length ? (
              <span style={{ fontSize: 11, opacity: 0.5 }}>Chưa có — lưu từ inspector</span>
            ) : null}
          </div>
        </aside>

        {/* Canvas */}
        <div
          style={{
            background: '#1a222c',
            borderRadius: 10,
            padding: 16,
            display: 'flex',
            justifyContent: 'center',
            overflow: 'auto',
          }}
        >
          <div
            style={{
              width: VIEWPORTS[viewport],
              maxWidth: '100%',
              background: '#faf6f4',
              color: '#1a1214',
              borderRadius: 8,
              minHeight: 420,
              padding: 16,
              transition: 'width 0.2s ease',
            }}
          >
            {content.section_order.map((key) => {
              const node = content.sections[key];
              if (!node) return null;
              const active = selected === key;
              const legacy = supports.length > 0 && !supportSet.has(node.type);
              return (
                <div
                  key={key}
                  onClick={() => setSelected(key)}
                  style={{
                    marginBottom: 10,
                    padding: 12,
                    borderRadius: 8,
                    border: active ? '2px solid #3d8bfd' : '1px dashed rgba(0,0,0,0.12)',
                    cursor: 'pointer',
                    opacity: legacy ? 0.55 : 1,
                    background: '#fff',
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>
                    {node.type}
                    {legacy ? ' · legacy (ẩn trên theme mới)' : ''}
                  </div>
                  <CanvasPreview node={node} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Inspector */}
        <aside style={{ background: '#0f151c', color: '#d7e0ea', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8 }}>INSPECTOR</div>
          {!selectedNode ? (
            <p style={{ fontSize: 13, opacity: 0.7 }}>Chọn một section</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {(Object.keys(selectedNode.props).length
                ? Object.keys(selectedNode.props)
                : ['headline']
              ).map((field) => {
                const val = selectedNode.props[field];
                if (field === 'items' && Array.isArray(val)) {
                  const text =
                    typeof val[0] === 'string'
                      ? (val as string[]).join(' | ')
                      : JSON.stringify(val);
                  return (
                    <label key={field} style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                      {field}
                      <textarea
                        value={text}
                        rows={3}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (typeof val[0] === 'string') {
                            updateProp(
                              field,
                              raw
                                .split('|')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            );
                          } else {
                            try {
                              updateProp(field, JSON.parse(raw));
                            } catch {
                              /* ignore */
                            }
                          }
                        }}
                        style={inputDark}
                      />
                    </label>
                  );
                }
                if (field === 'columns') {
                  return (
                    <label key={field} style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                      columns (JSON)
                      <textarea
                        value={JSON.stringify(val, null, 0)}
                        rows={4}
                        onChange={(e) => {
                          try {
                            updateProp(field, JSON.parse(e.target.value));
                          } catch {
                            /* ignore */
                          }
                        }}
                        style={inputDark}
                      />
                    </label>
                  );
                }
                if (field === 'media_id') {
                  return (
                    <label key={field} style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                      media
                      <select
                        value={String(val || '')}
                        onChange={(e) => updateProp('media_id', e.target.value || null)}
                        style={inputDark}
                      >
                        <option value="">— none —</option>
                        {mediaList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.alt || m.id}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }
                return (
                  <label key={field} style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                    {field}
                    <input
                      value={String(val ?? '')}
                      onChange={(e) =>
                        updateProp(
                          field,
                          field === 'limit' ? Number(e.target.value) || 0 : e.target.value,
                        )
                      }
                      style={inputDark}
                    />
                  </label>
                );
              })}
              <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                style.padding
                <input
                  value={String(selectedNode.style.padding || '')}
                  onChange={(e) => updateStyle('padding', e.target.value)}
                  style={inputDark}
                  placeholder="16px"
                />
              </label>
              <button
                type="button"
                style={btnDark}
                onClick={async () => {
                  if (!selected || !selectedNode) return;
                  const name = `${selectedNode.type} · ${new Date().toLocaleTimeString('vi-VN')}`;
                  const saved = await saveBlockAction({
                    name,
                    section_type: selectedNode.type,
                    content: selectedNode,
                  });
                  setBlocks((b) => [saved, ...b]);
                }}
              >
                Lưu thành saved block
              </button>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>AI COPY (draft only)</div>
              <button
                type="button"
                style={btnDark}
                onClick={async () => {
                  const headline = String(
                    selectedNode.props.headline || selectedNode.props.title || selectedNode.props.text || 'Headline',
                  );
                  const res = await suggestCopyAction(headline);
                  setAiVariants(res.variants || []);
                }}
              >
                Gợi ý copy (không publish)
              </button>
              {aiVariants.length ? (
                <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 12 }}>
                  {aiVariants.map((v) => (
                    <li key={v} style={{ marginBottom: 4 }}>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#9ec1ff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          padding: 0,
                        }}
                        onClick={() => {
                          if (selectedNode.props.headline !== undefined) updateProp('headline', v);
                          else if (selectedNode.props.title !== undefined) updateProp('title', v);
                          else if (selectedNode.props.text !== undefined) updateProp('text', v);
                          else updateProp('headline', v);
                        }}
                      >
                        {v}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          <div style={{ fontSize: 11, opacity: 0.6, margin: '16px 0 6px' }}>SEO</div>
          <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
            title
            <input
              value={seo.title || ''}
              onChange={(e) => {
                const next = { ...seo, title: e.target.value };
                setSeo(next);
                scheduleSave(content, next);
              }}
              style={inputDark}
            />
          </label>
          <label style={{ fontSize: 12, display: 'grid', gap: 4, marginTop: 6 }}>
            description
            <input
              value={seo.description || ''}
              onChange={(e) => {
                const next = { ...seo, description: e.target.value };
                setSeo(next);
                scheduleSave(content, next);
              }}
              style={inputDark}
            />
          </label>

          <div style={{ fontSize: 11, opacity: 0.6, margin: '16px 0 6px' }}>MEDIA STUB</div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const url = String(fd.get('url') || '');
              const alt = String(fd.get('alt') || '');
              if (!url) return;
              const item = await createMediaAction(url, alt);
              setMediaList((m) => [item, ...m]);
              e.currentTarget.reset();
            }}
            style={{ display: 'grid', gap: 6 }}
          >
            <input name="url" placeholder="https://…/image.jpg" style={inputDark} required />
            <input name="alt" placeholder="alt" style={inputDark} />
            <button type="submit" style={btnDark}>
              Thêm media URL
            </button>
          </form>

          <div style={{ fontSize: 11, opacity: 0.6, margin: '16px 0 6px' }}>HEADER NAV</div>
          <textarea
            value={navDraft}
            onChange={(e) => setNavDraft(e.target.value)}
            rows={4}
            style={inputDark}
            placeholder={'Label|/href'}
          />
          <button
            type="button"
            style={{ ...btnDark, marginTop: 6 }}
            onClick={async () => {
              const items = navDraft
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)
                .map((l) => {
                  const [label, href] = l.split('|').map((s) => s.trim());
                  return { label: label || 'Link', href: href || '/' };
                });
              const saved = await saveNavAction(items);
              setNavItems(saved);
            }}
          >
            Lưu menu header
          </button>
          <p style={{ fontSize: 11, opacity: 0.55, marginTop: 6 }}>{navItems.length} links</p>
        </aside>
      </div>
    </div>
  );
}

function CanvasPreview({ node }: { node: SectionNode }) {
  const p = node.props;
  if (node.type === 'hero') {
    return (
      <div>
        <div style={{ fontSize: 11, opacity: 0.6 }}>{String(p.eyebrow || '')}</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{String(p.headline || 'Hero')}</div>
      </div>
    );
  }
  if (node.type === 'trust') {
    const items = Array.isArray(p.items) ? (p.items as string[]) : [];
    return <div style={{ fontSize: 12 }}>{items.join(' · ')}</div>;
  }
  if (node.type === 'cta_banner') {
    return <div style={{ fontWeight: 600 }}>{String(p.title || 'CTA')}</div>;
  }
  if (node.type === 'rich_text') {
    return (
      <div>
        <strong>{String(p.title || '')}</strong>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{String(p.body || '').slice(0, 80)}</div>
      </div>
    );
  }
  if (node.type === 'footer_links') {
    const cols = Array.isArray(p.columns) ? (p.columns as Array<{ title?: string }>) : [];
    return <div style={{ fontSize: 12 }}>Footer · {cols.map((c) => c.title).join(', ')}</div>;
  }
  return <div style={{ fontSize: 12, opacity: 0.7 }}>{node.type}</div>;
}

const btnDark: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  background: '#1c2530',
  color: '#fff',
  fontSize: 12,
};

const btnTiny: CSSProperties = {
  ...btnDark,
  padding: '2px 6px',
  fontSize: 11,
};

const inputDark: CSSProperties = {
  width: '100%',
  padding: 8,
  borderRadius: 6,
  border: '1px solid #2a3544',
  background: '#161d27',
  color: '#e8eef5',
  fontSize: 12,
  boxSizing: 'border-box',
};
