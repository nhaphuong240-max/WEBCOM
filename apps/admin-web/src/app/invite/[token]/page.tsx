'use client';

import { useEffect, useState } from 'react';

const API =
  process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';

export default function InviteAcceptPage({
  params,
}: {
  params: { token: string } | Promise<{ token: string }>;
}) {
  const [token, setToken] = useState('');
  const [preview, setPreview] = useState<{ email: string; name: string | null; role_codes: string[] } | null>(
    null,
  );
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.resolve(params).then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    void fetch(`${API}/api/v1/public/invites/${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((d) => {
        setPreview(d);
        setName(d.name || '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Invite invalid'));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/v1/public/invites/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password, name: name || undefined }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error?.message || `HTTP ${res.status}`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accept failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main style={{ maxWidth: 420, margin: '48px auto', padding: 24, fontFamily: 'system-ui' }}>
        <h1>Tài khoản đã kích hoạt</h1>
        <p>Đăng nhập Console bằng email invite.</p>
        <a href="/console/login">→ Login</a>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: '48px auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1>Chấp nhận lời mời</h1>
      {preview ? (
        <p style={{ color: '#555' }}>
          {preview.email} · roles: {preview.role_codes?.join(', ')}
        </p>
      ) : null}
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Tên
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Mật khẩu (≥8)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error ? <p style={{ color: 'crimson', fontSize: 13 }}>{error}</p> : null}
        <button type="submit" disabled={busy || !password}>
          {busy ? '…' : 'Kích hoạt'}
        </button>
      </form>
    </main>
  );
}
