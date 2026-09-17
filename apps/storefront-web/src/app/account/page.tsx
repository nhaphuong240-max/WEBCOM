'use client';

import { FormEvent, useState } from 'react';
import { StoreShell } from '../../components/StoreShell';
import { storeApi } from '../../lib/api';

export default function AccountPage() {
  const [mode, setMode] = useState<'login' | 'otp' | 'register'>('login');
  const [msg, setMsg] = useState('');
  const [token, setToken] = useState('');
  const [customer, setCustomer] = useState<{ id: string; name?: string; email?: string | null } | null>(
    null,
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      setMsg('');
      if (mode === 'otp') {
        const res = await storeApi<{
          access_token: string;
          customer: { id: string; name: string; email: string | null };
        }>('/v1/customers/login-otp', {
          method: 'POST',
          cache: 'no-store',
          body: JSON.stringify({ phone: fd.get('phone'), otp: fd.get('otp') }),
        });
        setToken(res.access_token);
        setCustomer(res.customer);
        localStorage.setItem('aura_customer_token', res.access_token);
        setMsg('Đăng nhập OTP thành công');
        return;
      }
      if (mode === 'register') {
        await storeApi('/v1/customers/register', {
          method: 'POST',
          cache: 'no-store',
          body: JSON.stringify({
            email: fd.get('email'),
            password: fd.get('password'),
            name: fd.get('name'),
            consent_marketing: true,
          }),
        });
        setMsg('Đăng ký OK — hãy đăng nhập');
        setMode('login');
        return;
      }
      const res = await storeApi<{
        access_token: string;
        customer: { id: string; name: string; email: string | null };
      }>('/v1/customers/login', {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }),
      });
      setToken(res.access_token);
      setCustomer(res.customer);
      localStorage.setItem('aura_customer_token', res.access_token);
      setMsg('Đăng nhập thành công');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi');
    }
  }

  return (
    <StoreShell>
      <div style={{ padding: 16 }}>
        <h1 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 26 }}>Tài khoản</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['login', 'otp', 'register'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: mode === m ? '1.5px solid #c45a6a' : '1px solid #ddd',
                background: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {m}
            </button>
          ))}
        </div>
        {customer ? (
          <div style={{ background: '#fff', padding: 14, borderRadius: 12 }}>
            <p>
              Xin chào <strong>{customer.name || customer.email || customer.id}</strong>
            </p>
            <p style={{ fontSize: 12, color: '#6b5559' }}>Token lưu local (W2 stub).</p>
            <p style={{ fontSize: 11, wordBreak: 'break-all' }}>{token.slice(0, 48)}…</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
            {mode === 'otp' ? (
              <>
                <input name="phone" placeholder="SĐT" required style={inp} />
                <input name="otp" placeholder="OTP (000000)" required style={inp} />
              </>
            ) : (
              <>
                {mode === 'register' ? (
                  <input name="name" placeholder="Tên" style={inp} />
                ) : null}
                <input name="email" type="email" placeholder="Email" required style={inp} />
                <input name="password" type="password" placeholder="Mật khẩu" required style={inp} />
              </>
            )}
            <button
              type="submit"
              style={{
                height: 44,
                border: 'none',
                borderRadius: 8,
                background: '#1a1214',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              Tiếp tục
            </button>
          </form>
        )}
        {msg ? <p style={{ marginTop: 10, fontSize: 13 }}>{msg}</p> : null}
      </div>
    </StoreShell>
  );
}

const inp: React.CSSProperties = {
  height: 44,
  borderRadius: 8,
  border: '1px solid #ddd',
  padding: '0 12px',
};
