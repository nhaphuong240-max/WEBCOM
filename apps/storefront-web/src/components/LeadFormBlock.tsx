'use client';

import { FormEvent, useState } from 'react';
import { STOREFRONT_ID } from '../lib/api';

const API =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';

export function LeadFormBlock({
  title = 'Đăng ký tư vấn',
  cta = 'Gửi đăng ký',
  accent = '#c45a6a',
  consentLabel = 'Tôi đồng ý xử lý dữ liệu cá nhân',
  requireConsent = true,
}: {
  title?: string;
  cta?: string;
  accent?: string;
  consentLabel?: string;
  requireConsent?: boolean;
}) {
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API}/api/v1/public/storefronts/${STOREFRONT_ID}/leads`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID || 'ten_aura',
          'x-brand-id': process.env.NEXT_PUBLIC_BRAND_ID || 'brd_aura',
        },
        body: JSON.stringify({
          full_name: fd.get('full_name'),
          phone: fd.get('phone'),
          email: fd.get('email') || undefined,
          message: fd.get('message') || undefined,
          consent: fd.get('consent') === 'on',
          page_url: typeof window !== 'undefined' ? window.location.href : '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `Lỗi ${res.status}`);
      setOk(true);
      setMsg('Đã gửi đăng ký. Cảm ơn bạn!');
      e.currentTarget.reset();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ padding: '20px clamp(14px, 3vw, 48px)' }}>
      <h2 style={{ fontFamily: 'var(--ptt-font-display)', margin: '0 0 12px' }}>{title}</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
        <input name="full_name" required placeholder="Họ tên" style={field} />
        <input name="phone" required placeholder="Số điện thoại" style={field} />
        <input name="email" type="email" placeholder="Email (tuỳ chọn)" style={field} />
        <textarea name="message" placeholder="Nhu cầu / ghi chú" rows={3} style={{ ...field, height: 'auto' }} />
        {requireConsent ? (
          <label style={{ fontSize: 12, color: '#6b5559' }}>
            <input type="checkbox" name="consent" required defaultChecked /> {consentLabel}
          </label>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          style={{
            height: 44,
            border: 0,
            borderRadius: 10,
            background: accent,
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {busy ? '…' : cta}
        </button>
        {msg ? <p style={{ color: ok ? '#0a7a3e' : 'crimson', fontSize: 13, margin: 0 }}>{msg}</p> : null}
      </form>
    </section>
  );
}

const field: React.CSSProperties = {
  height: 40,
  borderRadius: 8,
  border: '1px solid rgba(26,18,20,0.12)',
  padding: '0 12px',
  font: 'inherit',
};
