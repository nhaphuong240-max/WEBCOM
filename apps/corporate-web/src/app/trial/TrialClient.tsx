'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Input, PttMark } from '@ptt/ui';

const API =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
const CONSOLE =
  process.env.NEXT_PUBLIC_CONSOLE_URL?.replace(/\/$/, '') ||
  'https://webecom.ngoinhahomnay.vn/console';

export default function TrialPage() {
  const sp = useSearchParams();
  const templateCode = useMemo(() => sp.get('template') || '', [sp]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API}/api/v1/public/trial/signup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: fd.get('email'),
          password: fd.get('password'),
          name: fd.get('name'),
          company: fd.get('company'),
          template_code: templateCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Signup failed');
      const q = new URLSearchParams({
        access_token: data.access_token,
        tenant_id: data.tenant_id,
        brand_id: data.brand_id,
        storefront_id: data.storefront_id,
        actor_id: data.user_id,
        next: '/website/onboarding',
      });
      window.location.href = `${CONSOLE}/auth/callback?${q.toString()}`;
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi');
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '48px 24px 80px' }}>
      <Link href="/" style={{ color: '#7dd3fc', fontSize: 14 }}>
        ← PTT
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 8px' }}>
        <PttMark />
        <strong>Dùng thử miễn phí</strong>
      </div>
      <h1
        style={{
          fontFamily: 'var(--ptt-font-display)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          letterSpacing: '-0.03em',
          margin: '0 0 8px',
        }}
      >
        Tạo storefront trial
      </h1>
      <p style={{ opacity: 0.75, marginBottom: 24 }}>
        Không cần thanh toán trước. Sau trial có thể mua theme (P3).
        {templateCode ? (
          <>
            {' '}
            Template: <code>{templateCode}</code>
          </>
        ) : null}
      </p>

      <form
        onSubmit={onSubmit}
        style={{
          display: 'grid',
          gap: 10,
          padding: 20,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <Input name="company" placeholder="Tên công ty / shop" required />
        <Input name="name" placeholder="Họ tên" />
        <Input name="email" type="email" placeholder="Email công việc" required />
        <Input
          name="password"
          type="password"
          placeholder="Mật khẩu (≥8 ký tự)"
          required
          minLength={8}
        />
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Đang tạo…' : 'Bắt đầu trial'}
        </Button>
        {msg ? <p style={{ color: '#fca5a5', fontSize: 13 }}>{msg}</p> : null}
        <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>
          Đã có tài khoản?{' '}
          <a href={`${CONSOLE}/login`} style={{ color: '#7dd3fc' }}>
            Đăng nhập console
          </a>
        </p>
      </form>
    </main>
  );
}
