'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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
    <main className="corp-page">
      <div className="corp-page-h">
        <div className="corp-eyebrow">Trial</div>
        <h1>Tạo storefront trial</h1>
        <p>
          Không cần thanh toán trước. Sau trial có thể mua theme (P3).
          {templateCode ? (
            <>
              {' '}
              Template: <code style={{ color: 'var(--accent)', fontWeight: 600 }}>{templateCode}</code>
            </>
          ) : null}
        </p>
      </div>

      <form className="corp-form-card" onSubmit={onSubmit}>
        <div>
          <label htmlFor="company">Tên công ty / shop</label>
          <input id="company" name="company" placeholder="Aura Beauty" required />
        </div>
        <div>
          <label htmlFor="name">Họ tên</label>
          <input id="name" name="name" placeholder="Nguyễn Văn A" />
        </div>
        <div>
          <label htmlFor="email">Email công việc</label>
          <input id="email" name="email" type="email" placeholder="you@company.vn" required />
        </div>
        <div>
          <label htmlFor="password">Mật khẩu (≥8 ký tự)</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>
        <button type="submit" className="corp-btn corp-btn-primary" disabled={busy}>
          {busy ? 'Đang tạo…' : 'Bắt đầu trial'}
        </button>
        {msg ? <p style={{ color: '#b91c1c', fontSize: 13, margin: 0 }}>{msg}</p> : null}
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          Đã có tài khoản?{' '}
          <a href={`${CONSOLE}/login`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Đăng nhập console
          </a>
        </p>
        <p style={{ fontSize: 13, margin: 0 }}>
          <Link href="/templates" style={{ color: 'var(--ink-3)' }}>
            ← Quay lại marketplace
          </Link>
        </p>
      </form>
    </main>
  );
}
