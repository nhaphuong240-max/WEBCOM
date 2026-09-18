'use client';

import { useState, useTransition } from 'react';

type Compat = {
  ok?: boolean;
  warnings?: Array<string | { message?: string }>;
  legacy_sections?: string[];
};

export function InstallWithCompat({
  code,
  license,
  checkAction,
  installAction,
}: {
  code: string;
  license: string;
  checkAction: (code: string) => Promise<Compat>;
  installAction: (code: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [compat, setCompat] = useState<Compat | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  const startInstall = () => {
    setError('');
    start(async () => {
      try {
        const res = await checkAction(code);
        setCompat(res);
        const hasWarn =
          (res.warnings && res.warnings.length > 0) ||
          (res.legacy_sections && res.legacy_sections.length > 0);
        if (hasWarn) {
          setOpen(true);
          return;
        }
        await installAction(code);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Install failed');
      }
    });
  };

  const confirm = () => {
    start(async () => {
      try {
        await installAction(code);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Install failed');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={startInstall}
        disabled={pending}
        style={{
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #ccc',
          background: '#fff',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        {pending ? '…' : license === 'free' ? 'Install' : 'Install (licensed)'}
      </button>
      {error ? <span style={{ color: 'crimson', fontSize: 12, marginLeft: 6 }}>{error}</span> : null}
      {open && compat ? (
        <div
          role="dialog"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 80,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 20,
              maxWidth: 420,
              width: '90%',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Compatibility — {code}</h3>
            <p style={{ fontSize: 13 }}>
              Theme mới có thể ẩn một số section (legacy). Xác nhận trước khi cài.
            </p>
            {compat.legacy_sections?.length ? (
              <p style={{ fontSize: 13 }}>
                Legacy: <code>{compat.legacy_sections.join(', ')}</code>
              </p>
            ) : null}
            <ul style={{ fontSize: 13 }}>
              {(compat.warnings || []).map((w, i) => (
                <li key={i}>{typeof w === 'string' ? w : w.message || JSON.stringify(w)}</li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setOpen(false)} style={{ padding: '8px 12px' }}>
                Hủy
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                style={{
                  padding: '8px 12px',
                  background: '#1a1214',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                }}
              >
                Vẫn cài
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
