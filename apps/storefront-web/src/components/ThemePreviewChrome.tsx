'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';

export type PreviewMode = 'desktop' | 'mobile';

type PreviewCtx = {
  active: boolean;
  mode: PreviewMode;
  setMode: (m: PreviewMode) => void;
  templateCode: string;
};

const PreviewContext = createContext<PreviewCtx>({
  active: false,
  mode: 'desktop',
  setMode: () => undefined,
  templateCode: '',
});

export function useThemePreview() {
  return useContext(PreviewContext);
}

function isDemoHostname(host: string) {
  const h = host.toLowerCase().split(':')[0];
  return (
    h === 'themes.ngoinhahomnay.vn' ||
    h.startsWith('demo.') ||
    h.startsWith('themes.') ||
    h.includes('.themes.')
  );
}

const PLATFORM =
  process.env.NEXT_PUBLIC_PLATFORM_URL?.replace(/\/$/, '') ||
  'https://webecom.ngoinhahomnay.vn';
const CONSOLE =
  process.env.NEXT_PUBLIC_CONSOLE_URL?.replace(/\/$/, '') ||
  'https://webecom.ngoinhahomnay.vn/console';

function IconDesktop({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="12"
        rx="1.5"
        stroke={active ? '#fff' : 'rgba(255,255,255,0.55)'}
        strokeWidth="1.6"
      />
      <path
        d="M8 20h8M12 16v4"
        stroke={active ? '#fff' : 'rgba(255,255,255,0.55)'}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMobile({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="7"
        y="2"
        width="10"
        height="20"
        rx="2"
        stroke={active ? '#fff' : 'rgba(255,255,255,0.55)'}
        strokeWidth="1.6"
      />
      <circle cx="12" cy="18.5" r="0.9" fill={active ? '#fff' : 'rgba(255,255,255,0.55)'} />
    </svg>
  );
}

function PreviewBar({
  mode,
  setMode,
  templateCode,
}: {
  mode: PreviewMode;
  setMode: (m: PreviewMode) => void;
  templateCode: string;
}) {
  const backHref = templateCode
    ? `${PLATFORM}/templates?focus=${encodeURIComponent(templateCode)}`
    : `${PLATFORM}/templates`;
  const buyHref = templateCode
    ? `${CONSOLE}/website/templates?focus=${encodeURIComponent(templateCode)}`
    : `${PLATFORM}/templates`;
  const closeHref = `${PLATFORM}/templates`;

  return (
    <header
      style={{
        position: 'fixed',
        inset: '0 0 auto',
        zIndex: 200,
        height: 52,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 12,
        padding: '0 14px',
        background: '#2b2f36',
        color: '#fff',
        fontFamily: 'var(--ptt-font-body), system-ui, sans-serif',
        fontSize: 13,
        boxShadow: '0 1px 0 rgba(0,0,0,0.25)',
      }}
    >
      <a
        href={backHref}
        style={{
          color: 'rgba(255,255,255,0.92)',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          justifySelf: 'start',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
          ‹
        </span>
        Quay về xem chi tiết
      </a>

      <div
        role="group"
        aria-label="Chế độ xem"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: 3,
        }}
      >
        <button
          type="button"
          aria-pressed={mode === 'desktop'}
          aria-label="Desktop"
          onClick={() => setMode('desktop')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 34,
            padding: '0 12px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            background: mode === 'desktop' ? 'rgba(255,255,255,0.14)' : 'transparent',
            color: mode === 'desktop' ? '#fff' : 'rgba(255,255,255,0.55)',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <IconDesktop active={mode === 'desktop'} />
          <span className="preview-mode-label">Desktop</span>
        </button>
        <button
          type="button"
          aria-pressed={mode === 'mobile'}
          aria-label="Mobile"
          onClick={() => setMode('mobile')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 34,
            padding: '0 12px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            background: mode === 'mobile' ? 'rgba(255,255,255,0.14)' : 'transparent',
            color: mode === 'mobile' ? '#fff' : 'rgba(255,255,255,0.55)',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <IconMobile active={mode === 'mobile'} />
          <span className="preview-mode-label">Mobile</span>
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifySelf: 'end',
        }}
      >
        <a
          href={buyHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 36,
            padding: '0 16px',
            background: '#2f6bff',
            color: '#fff',
            borderRadius: 4,
            fontWeight: 700,
            fontSize: 13,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Mua ngay
        </a>
        <a
          href={closeHref}
          aria-label="Đóng preview"
          style={{
            width: 32,
            height: 32,
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(255,255,255,0.75)',
            textDecoration: 'none',
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          ×
        </a>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .preview-mode-label { display: none; }
        }
      `}</style>
    </header>
  );
}

export function ThemePreviewChrome({ children }: { children: ReactNode }) {
  const sp = useSearchParams();
  const templateCode = (sp.get('demo') || '').trim();
  const [hostReady, setHostReady] = useState(false);
  const [isDemoHost, setIsDemoHost] = useState(false);
  const [mode, setModeState] = useState<PreviewMode>('desktop');

  useEffect(() => {
    setIsDemoHost(isDemoHostname(window.location.hostname));
    setHostReady(true);
    try {
      const saved = sessionStorage.getItem('ptt_preview_mode') as PreviewMode | null;
      if (saved === 'desktop' || saved === 'mobile') setModeState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setMode = useCallback((m: PreviewMode) => {
    setModeState(m);
    try {
      sessionStorage.setItem('ptt_preview_mode', m);
    } catch {
      /* ignore */
    }
  }, []);

  const active = hostReady && (isDemoHost || !!templateCode);

  const ctx = useMemo(
    () => ({ active, mode, setMode, templateCode }),
    [active, mode, setMode, templateCode],
  );

  if (!active) {
    return <PreviewContext.Provider value={ctx}>{children}</PreviewContext.Provider>;
  }

  return (
    <PreviewContext.Provider value={ctx}>
      <PreviewBar mode={mode} setMode={setMode} templateCode={templateCode} />
      <div
        style={{
          paddingTop: 52,
          minHeight: '100dvh',
          background: mode === 'mobile' ? '#1a1d22' : '#e8eaee',
          display: 'flex',
          justifyContent: 'center',
          alignItems: mode === 'mobile' ? 'flex-start' : 'stretch',
        }}
      >
        <div
          data-preview-mode={mode}
          style={
            mode === 'mobile'
              ? {
                  width: 'min(390px, 100%)',
                  minHeight: 'calc(100dvh - 52px)',
                  margin: '12px auto 24px',
                  background: '#fff',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }
              : {
                  width: '100%',
                  minHeight: 'calc(100dvh - 52px)',
                  background: 'transparent',
                }
          }
        >
          {children}
        </div>
      </div>
    </PreviewContext.Provider>
  );
}
