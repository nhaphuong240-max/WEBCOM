'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const HELP_OPTIONS = [
  { id: 'theme', label: 'Chọn theme & mở storefront', icon: '◇' },
  { id: 'redesign', label: 'Đổi giao diện shop hiện có', icon: '▣' },
  { id: 'live', label: 'Live / social commerce', icon: '●' },
  { id: 'pos', label: 'Đồng bộ POS & tồn', icon: '▦' },
  { id: 'crm', label: 'CRM · loyalty · LTV', icon: '◎' },
  { id: 'ai', label: 'AI bán hàng có approval', icon: '✦' },
] as const;

export function HeroConcierge() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [need, setNeed] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const canContinue = need.trim().length >= 3 || picked.length > 0;

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function continueWizard() {
    if (!canContinue) return;
    if (step < 2) {
      setStep(2);
      return;
    }
    const q = [need.trim(), ...picked].filter(Boolean).join(' ');
    router.push(`/templates?q=${encodeURIComponent(q.slice(0, 80))}`);
  }

  const progress = useMemo(() => (step / 2) * 100, [step]);

  return (
    <div className="tm-hero">
      <div className="tm-hero-glow" aria-hidden />
      <div className="tm-hero-copy">
        <p className="tm-hero-eyebrow">Bỏ qua tìm kiếm dài dòng</p>
        <h1>Nói bạn đang xây gì. WebCom tìm theme phù hợp.</h1>
      </div>

      <div className="tm-wizard">
        <div className="tm-wizard-progress">
          <div className="tm-wizard-track" aria-hidden>
            <div className="tm-wizard-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>Step {step} of 2</span>
        </div>

        {step === 1 ? (
          <>
            <h2>Bạn cần WebCom hỗ trợ việc gì?</h2>
            <p className="tm-wizard-sub">
              Mô tả bằng lời của bạn, chọn nhu cầu bên dưới — hoặc cả hai. Càng rõ, gợi ý theme càng
              sát.
            </p>
            <textarea
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              placeholder="vd. Shop mỹ phẩm + live TikTok, cần theme mobile-first và trial trước khi mua…"
              rows={3}
            />
            <div className="tm-wizard-options">
              {HELP_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={picked.includes(o.id) ? 'active' : ''}
                  onClick={() => toggle(o.id)}
                >
                  <span className="ico" aria-hidden>
                    {o.icon}
                  </span>
                  {o.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2>Sẵn sàng xem catalog khớp nhu cầu</h2>
            <p className="tm-wizard-sub">
              Chúng tôi sẽ mở marketplace với bộ lọc từ mô tả của bạn. Có thể chỉnh facet thêm trên
              trang Templates.
            </p>
            <ul className="tm-wizard-summary">
              {need.trim() ? <li>Mô tả: {need.trim()}</li> : null}
              {picked.map((id) => {
                const o = HELP_OPTIONS.find((x) => x.id === id);
                return o ? <li key={id}>{o.label}</li> : null;
              })}
            </ul>
          </>
        )}

        <div className="tm-wizard-actions">
          {step > 1 ? (
            <button type="button" className="tm-btn tm-btn-ghost-dark" onClick={() => setStep(1)}>
              Quay lại
            </button>
          ) : (
            <Link href="/templates" className="tm-btn tm-btn-ghost-dark">
              Browse all
            </Link>
          )}
          <button
            type="button"
            className="tm-btn tm-btn-primary"
            disabled={!canContinue}
            onClick={continueWizard}
          >
            {step === 1 ? 'Continue' : 'Xem templates'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LeadForm() {
  const API = process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
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
          channel: 'website',
          message: fd.get('message'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed');
      setMsg('Đã gửi — sales sẽ liên hệ trong giờ làm việc.');
      e.currentTarget.reset();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="tm-lead" onSubmit={onSubmit} id="lead">
      <div className="tm-lead-title">Đặt demo với sales</div>
      <input name="name" placeholder="Họ tên" required />
      <input name="email" type="email" placeholder="Email công việc" required />
      <input name="phone" placeholder="SĐT" />
      <input name="company" placeholder="Công ty" />
      <input name="message" placeholder="Nhu cầu" />
      <button type="submit" className="tm-btn tm-btn-primary" disabled={busy}>
        {busy ? 'Đang gửi…' : 'Gửi lead'}
      </button>
      {msg ? <p className="tm-lead-msg">{msg}</p> : null}
    </form>
  );
}
