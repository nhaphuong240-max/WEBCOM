'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
const DEMO = process.env.NEXT_PUBLIC_DEMO_URL?.replace(/\/$/, '') || 'https://themes.ngoinhahomnay.vn';

const SOLUTIONS = [
  {
    title: 'Website Commerce',
    body: 'Template → Brand Kit → Builder → Go-live gate. Publish an toàn, rollback được.',
    href: '/templates',
  },
  {
    title: 'Social / Live',
    body: 'Inbox đa kênh, keyword order, live drop — gắn attribution và tồn realtime.',
    href: '/#solutions',
  },
  {
    title: 'POS & chuỗi',
    body: 'Đồng bộ giá · tồn · khách web ↔ quầy. Offline queue khi mạng yếu.',
    href: '/#solutions',
  },
  {
    title: 'Marketplace',
    body: 'Shopee · Lazada · TikTok Shop — listing, tồn, đơn, fee-aware P&L.',
    href: '/#solutions',
  },
  {
    title: 'CRM & Loyalty',
    body: 'Customer 360, RFM, journey, loyalty ledger — đo LTV:CAC, không chỉ open rate.',
    href: '/#crm',
  },
  {
    title: 'AI có hàng rào',
    body: 'Care / NBA / social reply — high-risk bắt buộc duyệt. Không auto-refund.',
    href: '/#ai',
  },
];

export default function CorporateHome() {
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
    <main>
      <section className="corp-hero">
        <div className="corp-hero-inner">
          <div className="corp-brand-hero">
            PTT<em>.</em>
          </div>
          <h1>Bán đa kênh có lãi.</h1>
          <p className="sub">
            Website Commerce + Omnichannel + CRM + AI — điều hành theo contribution margin, không
            chỉ GMV.
          </p>
          <div className="corp-hero-actions">
            <Link href="/templates" className="corp-btn corp-btn-primary">
              Chọn template
            </Link>
            <Link href="/trial" className="corp-btn corp-btn-ghost-light">
              Dùng thử miễn phí
            </Link>
            <a href={DEMO} className="corp-btn corp-btn-ghost-light">
              Xem demo shop
            </a>
          </div>
        </div>
        <div className="corp-hero-plane" aria-hidden>
          <div className="corp-hero-plane-inner">
            <div className="corp-hp-kpi">
              <div className="l">Contribution margin</div>
              <div className="v">18.4%</div>
              <div className="d">+2.1pp vs tuần trước · sau fee & return</div>
            </div>
            <div className="corp-hp-row">
              <div className="corp-hp-mini">
                Web
                <b>42%</b>
              </div>
              <div className="corp-hp-mini">
                Live
                <b>27%</b>
              </div>
              <div className="corp-hp-mini">
                Sàn
                <b>19%</b>
              </div>
              <div className="corp-hp-mini">
                POS
                <b>12%</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="corp-proof">
        <div className="corp-proof-grid">
          <div>
            <div className="n">30+</div>
            <div className="t">Conversion playbooks / templates</div>
          </div>
          <div>
            <div className="n">1 OS</div>
            <div className="t">Web · Social · POS · Sàn · CRM</div>
          </div>
          <div>
            <div className="n">BR-018</div>
            <div className="t">AI high-risk bắt buộc approval</div>
          </div>
          <div>
            <div className="n">P3</div>
            <div className="t">Mua theme VietQR · trial trước paywall</div>
          </div>
        </div>
      </section>

      <section className="corp-sec" id="solutions">
        <div className="corp-sec-narrow">
          <div className="corp-sec-h">
            <div className="corp-eyebrow">Giải pháp</div>
            <h2>Một nền tảng — đủ kênh bán hàng Việt Nam</h2>
            <p>
              Giống suite omnichannel bạn đã quen, nhưng PTT gắn margin, go-live gate và AI có
              hàng rào vào từng bước.
            </p>
          </div>
          <div className="corp-sol-grid">
            {SOLUTIONS.map((s) => (
              <Link key={s.title} href={s.href}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="corp-sec" style={{ background: 'var(--surface)' }} id="templates">
        <div className="corp-sec-narrow">
          <div className="corp-sec-h">
            <div className="corp-eyebrow">Template Marketplace</div>
            <h2>Chọn theme → xem demo → dùng thử → mua</h2>
            <p>
              Catalog công khai, demo live trên themes.ngoinhahomnay.vn, trial self-serve rồi mua
              license one-time khi sẵn sàng.
            </p>
          </div>
          <div className="corp-tpl-row">
            {[
              { name: 'Aura Commerce Lite', meta: 'Beauty · free' },
              { name: 'Live Drop', meta: 'Social · one_time' },
              { name: 'Atelier Luxe', meta: 'Fashion · one_time' },
            ].map((t) => (
              <div key={t.name} className="corp-tpl-item">
                <div className="meta">{t.meta}</div>
                <h3>{t.name}</h3>
                <Link href="/templates" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>
                  Xem catalog →
                </Link>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/templates" className="corp-btn corp-btn-primary">
              Vào marketplace
            </Link>
            <Link href="/trial" className="corp-btn corp-btn-ghost">
              Bắt đầu trial
            </Link>
          </div>
        </div>
      </section>

      <section className="corp-sec" id="crm">
        <div className="corp-sec-narrow corp-split">
          <div className="corp-sec-h" style={{ margin: 0 }}>
            <div className="corp-eyebrow">CRM & Retention</div>
            <h2>Nuôi dưỡng khách trọn đời — đo được LTV:CAC</h2>
            <p>
              Customer 360, RFM, loyalty, journey — holdout và contribution, không chỉ open rate.
            </p>
          </div>
          <ul className="corp-feat-lines">
            <li>
              <span className="num">01</span>
              <div>
                <strong>Customer 360°</strong>
                <span>Web, social, POS, sàn · merge identity có audit</span>
              </div>
            </li>
            <li>
              <span className="num">02</span>
              <div>
                <strong>RFM & segment</strong>
                <span>Chi tiêu, tần suất, hành vi, hạng thành viên</span>
              </div>
            </li>
            <li>
              <span className="num">03</span>
              <div>
                <strong>Loyalty ledger</strong>
                <span>Earn / redeem / expire · referral soft fraud</span>
              </div>
            </li>
            <li>
              <span className="num">04</span>
              <div>
                <strong>Journey & NBA</strong>
                <span>Consent + frequency cap · service recovery có approval</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="corp-sec" id="ai" style={{ background: 'var(--ink)', color: '#fff' }}>
        <div className="corp-sec-narrow">
          <div className="corp-sec-h">
            <div className="corp-eyebrow">AI Platform</div>
            <h2 style={{ color: '#fff' }}>AI bán hàng 24/7 — có policy và audit</h2>
            <p style={{ color: 'rgba(255,255,255,0.65)' }}>
              Care reply, NBA, social reply: high-risk → pending_approval. Không tự refund hay mass
              send.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
            }}
            className="corp-ai-grid"
          >
            {[
              { t: 'Sales / Care', b: 'Tư vấn SP, tồn, tạo draft — handoff khi low confidence.' },
              { t: 'Website', b: 'Theme match & copy — không tự publish. Go-live vẫn cần checklist.' },
              { t: 'Governance', b: 'Discount lớn, refund, mass send — luôn có người ký.' },
            ].map((x) => (
              <div
                key={x.t}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '28px 24px',
                }}
              >
                <div className="corp-eyebrow">{x.t}</div>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{x.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="corp-cta-band" id="demo">
        <h2>Sẵn sàng mở storefront?</h2>
        <p>Trial miễn phí trước — mua theme khi đã chạy được. Hoặc để sales đồng hành.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
          <Link href="/trial" className="corp-btn corp-btn-primary">
            Dùng thử ngay
          </Link>
          <Link href="/templates" className="corp-btn corp-btn-ghost-light">
            Xem templates
          </Link>
        </div>
        <form className="corp-lead-form" onSubmit={onSubmit}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Đặt demo với sales</div>
          <input name="name" placeholder="Họ tên" required />
          <input name="email" type="email" placeholder="Email công việc" required />
          <input name="phone" placeholder="SĐT" />
          <input name="company" placeholder="Công ty" />
          <input name="message" placeholder="Nhu cầu" />
          <button type="submit" className="corp-btn corp-btn-primary" disabled={busy}>
            {busy ? 'Đang gửi…' : 'Gửi lead'}
          </button>
          {msg ? <p style={{ fontSize: 13, opacity: 0.9 }}>{msg}</p> : null}
        </form>
      </section>
    </main>
  );
}
