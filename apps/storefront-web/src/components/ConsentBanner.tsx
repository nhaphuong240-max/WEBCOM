'use client';

import { useEffect, useState } from 'react';

const KEY = 'ptt_consent_v1';

export function ConsentBanner({
  hasPixel,
  hasGtm,
}: {
  hasPixel?: boolean;
  hasGtm?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 68,
        zIndex: 60,
        background: '#1a1214',
        color: '#faf6f4',
        borderRadius: 12,
        padding: 14,
        fontSize: 13,
        boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
        maxWidth: 406,
        margin: '0 auto',
      }}
    >
      <p style={{ margin: '0 0 10px' }}>
        Chúng tôi dùng cookie đo lường (GTM/Pixel) sau khi bạn đồng ý. Bạn có thể từ chối — mua hàng
        vẫn hoạt động.
        {hasGtm || hasPixel ? ' Tracking chỉ bật khi Accept.' : ''}
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(KEY, 'denied');
            setOpen(false);
          }}
          style={{
            height: 36,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'transparent',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Từ chối
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(KEY, 'granted');
            setOpen(false);
            window.dispatchEvent(new Event('ptt-consent-granted'));
          }}
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 8,
            border: 'none',
            background: '#c45a6a',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Đồng ý
        </button>
      </div>
    </div>
  );
}

export function useConsentGranted() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const read = () => setOk(localStorage.getItem(KEY) === 'granted');
    read();
    window.addEventListener('ptt-consent-granted', read);
    return () => window.removeEventListener('ptt-consent-granted', read);
  }, []);
  return ok;
}
