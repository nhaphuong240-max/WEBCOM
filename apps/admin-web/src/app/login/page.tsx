'use client';

import { FormEvent, useState } from 'react';
import { Button, Input, PageHeader, Panel } from '@ptt/ui';

const API =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';

export default function LoginPage() {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: fd.get('email'),
          password: fd.get('password'),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            (typeof data?.error === 'string' ? data.error : null) ||
            `Login failed (${res.status})`,
        );
      }
      const q = new URLSearchParams({
        access_token: data.access_token,
        tenant_id: data.tenant_id,
        brand_id: data.brand_id || '',
        storefront_id: data.storefront_id || '',
        actor_id: data.user_id || '',
        next: '/website/builder',
      });
      window.location.href = `/console/auth/callback?${q.toString()}`;
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi');
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Đăng nhập" description="Merchant / admin · vào CMS template sau login" />
      <Panel title="Login">
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10, maxWidth: 360 }}>
          <Input name="email" type="email" placeholder="Email" required defaultValue="" />
          <Input name="password" type="password" placeholder="Mật khẩu" required />
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? '…' : 'Đăng nhập'}
          </Button>
          {msg ? <p style={{ color: 'crimson', fontSize: 13 }}>{msg}</p> : null}
          <p style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.45, margin: 0 }}>
            Seed VPS: <code>admin@aura.local</code> / <code>AuraAdmin1!</code>
            <br />
            Sau login → <strong>Website · CMS → CMS · Site Builder</strong>
            <br />
            Link trực tiếp:{' '}
            <a href="/console/website/builder" style={{ color: 'var(--ptt-accent)' }}>
              /console/website/builder
            </a>
          </p>
          <p style={{ fontSize: 13, opacity: 0.7 }}>
            Chưa có tài khoản?{' '}
            <a href="https://webecom.ngoinhahomnay.vn/trial" style={{ color: 'var(--ptt-accent)' }}>
              Dùng thử miễn phí
            </a>
          </p>
        </form>
      </Panel>
    </>
  );
}
