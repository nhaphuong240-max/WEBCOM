'use client';

import { FormEvent, useState } from 'react';
import { Button, Input, PttMark } from '@ptt/ui';

const API = process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';

export default function CorporateHome() {
  const [msg, setMsg] = useState('');
  const [channel, setChannel] = useState('website');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API}/api/v1/leads`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID || 'ten_aura',
        },
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          phone: fd.get('phone'),
          company: fd.get('company'),
          channel,
          message: fd.get('message'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed');
      setMsg('Đã gửi — sales sẽ liên hệ (lead stub).');
      e.currentTarget.reset();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi');
    }
  }

  return (
    <main>
      <section
        style={{
          minHeight: '100vh',
          padding: '48px 24px',
          background:
            'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.18), transparent 40%), linear-gradient(160deg,#0b1420 0%,#122033 55%,#1a2a3f 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: 960,
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <PttMark />
          <strong style={{ letterSpacing: '0.04em' }}>PTT</strong>
        </div>
        <h1
          style={{
            fontFamily: 'var(--ptt-font-display)',
            fontSize: 'clamp(40px, 8vw, 72px)',
            letterSpacing: '-0.04em',
            margin: '0 0 16px',
            lineHeight: 1.05,
          }}
        >
          Omnichannel
          <br />
          có lãi.
        </h1>
        <p style={{ maxWidth: '36ch', opacity: 0.85, fontSize: 18, marginBottom: 28 }}>
          Website Commerce + CRM + Revenue Intelligence — mockup 01 GTM v1 (W2).
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 40, flexWrap: 'wrap' }}>
          {['Website', 'Social', 'POS', 'Marketplace'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c.toLowerCase())}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: channel === c.toLowerCase() ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)',
                background: channel === c.toLowerCase() ? 'rgba(56,189,248,0.15)' : 'transparent',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            display: 'grid',
            gap: 10,
            maxWidth: 420,
            background: 'rgba(255,255,255,0.04)',
            padding: 20,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Đăng ký demo</div>
          <Input name="name" placeholder="Họ tên" required />
          <Input name="email" type="email" placeholder="Email công việc" required />
          <Input name="phone" placeholder="SĐT" />
          <Input name="company" placeholder="Công ty" />
          <Input name="message" placeholder="Nhu cầu" />
          <Button type="submit" variant="primary">
            Gửi lead · kênh {channel}
          </Button>
          {msg ? <p style={{ fontSize: 13, opacity: 0.9 }}>{msg}</p> : null}
        </form>
      </section>
    </main>
  );
}
