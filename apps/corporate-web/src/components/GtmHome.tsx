'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LeadForm } from './HeroConcierge';

const CHANNELS = [
  {
    id: 'web',
    tab: 'Website',
    title: 'Website bán hàng chuẩn SEO — gắn commerce core',
    lead: 'Template có Conversion Playbook, Brand Kit, staging/rollback. Checkout server-side, Pixel/CAPI có consent.',
    bullets: [
      'Theme đo được CVR / Mobile / SEO score — không chỉ “đẹp”',
      'Gợi ý SP liên quan, deal, member price, COD ETA',
      'GA / Meta Pixel / CAPI / TikTok — health check sau publish',
      'Blog & landing gắn attribution + margin theo page',
    ],
    primary: { label: 'Xem Template Marketplace', href: '/templates' },
    secondary: { label: 'Bắt đầu trial', href: '/trial' },
    viz: { top: 'Storefront · Mobile', meta: 'CVR 3.8%', big: 'LCP · INP · CLS', scene: 'web' as const },
  },
  {
    id: 'social',
    tab: 'Social Commerce',
    title: 'Hội thoại đa kênh — chốt đơn từ comment & DM',
    lead: 'Inbox Messenger, Instagram, Zalo OA, Shopee Chat, TikTok. Comment → giỏ → đơn có policy AI.',
    bullets: [
      'Chatbot + AI reply + human handoff · risk medium cần duyệt',
      'Post / Reels comment-to-order tự gửi giỏ',
      'Click-to-Messenger ads gắn customer 360',
      'Mỗi draft order có ước tính margin & tồn',
    ],
    primary: { label: 'Đặt demo Social', href: '#demo' },
    viz: {
      top: 'Unified inbox',
      meta: '14 unread',
      big: 'Comment → Order',
      note: 'Keyword “SET A” · reserve 15 phút · COD',
      scene: 'social' as const,
    },
  },
  {
    id: 'live',
    tab: 'Livestream',
    title: 'Livestream — keyword, tồn realtime, margin sau show',
    lead: 'Chốt nhanh như live commerce quen thuộc. PTT thêm recovery COD, claim risk và contribution sau return.',
    bullets: [
      'Tự động quét bình luận → tạo đơn / gửi giỏ',
      'Gợi ý giỏ trên màn hình host',
      'Cập nhật tồn liên tục, alert stockout',
      'Retarget + báo cáo lãi/lỗ phiên live',
    ],
    primary: { label: 'Đặt demo Live', href: '#demo' },
    viz: {
      top: 'ON AIR',
      meta: '12.4k viewers',
      big: '₫286tr GMV',
      note: 'Contribution ước tính 19% · return risk cao',
      scene: 'live' as const,
    },
  },
  {
    id: 'pos',
    tab: 'Chuỗi cửa hàng',
    title: 'Chuỗi cửa hàng — POS đồng bộ online',
    lead: 'Giá, tồn, khách, khuyến mãi đồng bộ web ↔ quầy trên một tenant.',
    bullets: [
      'Ca làm, quét barcode, sửa giá theo quyền',
      'Split payment · QR · đổi trả web→store',
      'Tồn theo địa điểm, reservation chống oversell',
      'Báo cáo theo chi nhánh / nhân viên / ngành hàng',
    ],
    primary: { label: 'Xem Command Center', href: '/tour' },
    viz: {
      top: 'POS · 12 chi nhánh',
      meta: 'Sync < 5s',
      big: 'Offline queue',
      note: 'Bán được khi mạng yếu · đồng bộ khi online',
      scene: 'pos' as const,
    },
  },
  {
    id: 'mkt',
    tab: 'Sàn TMĐT',
    title: 'Shopee · Lazada · TikTok Shop · Tiki',
    lead: 'Listing, tồn, đơn, hoàn tập trung. Fee sàn vào unit economics — thấy kênh nào lỗ.',
    bullets: [
      'Stock sync / reconciliation · lag mục tiêu ≤ 60s',
      'Order / return / refund / tracking sync',
      'Nhập kho hàng loạt · phân loại hoàn theo sàn',
      'Fee sàn vào P&L — không chỉ GMV',
    ],
    primary: { label: 'Đặt demo sàn', href: '#demo' },
    viz: { top: '4 sàn', meta: 'Unmatched 0', big: 'Fee-aware P&L', bars: true, scene: 'mkt' as const },
  },
  {
    id: 'corp',
    tab: 'Website DN',
    title: 'Website doanh nghiệp — lead, booking, uy tín',
    lead: 'Trang dịch vụ, booking, form, hotline/Zalo. CMS có duyệt & version.',
    bullets: [
      'SEO / schema / CTA tối ưu lead',
      'Đồng bộ lead vào CRM + Sales Copilot',
      'Uỷ quyền agency / multi-brand',
    ],
    primary: { label: 'Đặt demo', href: '#demo' },
    viz: {
      top: 'Lead capture',
      meta: 'UTM + consent',
      big: 'Demo routing',
      note: 'Industry · size · intent → owner + SLA',
      scene: 'corp' as const,
    },
  },
] as const;

const CRM = [
  { n: '01', t: 'Customer 360°', d: 'Đồng bộ web, social, POS, sàn · merge identity có audit' },
  { n: '02', t: 'Phân khúc & RFM', d: 'Chi tiêu, tần suất, hành vi, hạng thành viên, geo' },
  { n: '03', t: 'Broadcast', d: 'Zalo ZNS · Email · Messenger · SMS — consent & frequency cap' },
  { n: '04', t: 'Loyalty & referral', d: 'Tích điểm, hạng, đổi quà · online đến cửa hàng' },
  { n: '05', t: 'Journey automation', d: 'Abandoned cart, post-purchase, win-back · đo contribution' },
];

const AI = [
  {
    tag: 'Sales / Care',
    title: 'AI Chat & Copilot',
    body: 'Tư vấn SP, tồn, giao hàng, tạo order draft. Handoff khi low confidence.',
  },
  {
    tag: 'Website',
    title: 'Theme Match & Conversion',
    body: 'Gợi ý template, copy, A/B — không tự publish. Go-live vẫn cần checklist.',
  },
  {
    tag: 'Governance',
    title: 'High-risk = bắt buộc duyệt',
    body: 'Discount lớn, refund, mass send, stock adjust — luôn có người ký.',
  },
];

const OPS = [
  { t: 'OMS thông minh', d: 'Gộp/tách đơn, bulk đẩy vận chuyển, suspect duplicate, exception queue.' },
  { t: 'Tồn đa kho', d: 'Reservation realtime, lô/hạn, transfer — giảm oversell đa kênh.' },
  { t: '15+ nhà vận chuyển', d: 'Label, tracking, COD expected/collected/remitted, dispute.' },
  { t: '12+ thanh toán + e-invoice', d: 'QR, ví, COD, BNPL · xuất VAT theo legal entity.' },
];

const GRAPH = [
  'Ads / Creative',
  'Creator / Live',
  'Landing / Web',
  'Hội thoại',
  'Đơn / COD',
  'Return',
  'Contribution',
];

function ChannelScene({ scene }: { scene: (typeof CHANNELS)[number]['viz']['scene'] }) {
  return (
    <div className={`gtm-scene gtm-scene-${scene}`} aria-hidden>
      <div className="gtm-scene-glow" />
      <div className="gtm-scene-layer gtm-scene-back" />
      <div className="gtm-scene-layer gtm-scene-mid" />
      <div className="gtm-scene-layer gtm-scene-front" />
      {scene === 'web' ? (
        <div className="gtm-scene-device">
          <div className="gtm-scene-notch" />
          <div className="gtm-scene-screen">
            <i />
            <i />
            <i />
          </div>
        </div>
      ) : null}
      {scene === 'live' ? <span className="gtm-scene-pulse" /> : null}
      {scene === 'social' ? (
        <div className="gtm-scene-bubbles">
          <span />
          <span />
          <span />
        </div>
      ) : null}
    </div>
  );
}

/** Mockup 01 — Corporate GTM narrative (margin-first). */
export function GtmHome({ locale = 'vi' }: { locale?: 'vi' | 'en' }) {
  const [tab, setTab] = useState<(typeof CHANNELS)[number]['id']>('web');
  const active = CHANNELS.find((c) => c.id === tab) || CHANNELS[0];
  const en = locale === 'en';

  useEffect(() => {
    const nodes = document.querySelectorAll('.gtm-reveal');
    if (!nodes.length) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      nodes.forEach((n) => n.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <div className="gtm-home">
      <section className="gtm-hero">
        <div className="gtm-hero-ambient" aria-hidden>
          <span className="gtm-orb gtm-orb-a" />
          <span className="gtm-orb gtm-orb-b" />
          <span className="gtm-orb gtm-orb-c" />
        </div>

        <div className="gtm-hero-grid">
          <div className="gtm-hero-inner">
            <p className="gtm-hero-kicker">
              {en ? 'Website templates & commerce OS' : 'Website templates & commerce OS'}
            </p>
            <div className="gtm-brand">
              PTT<em>.</em>
            </div>
            <h1>
              {en
                ? 'Sell omnichannel — run the business on real margin.'
                : 'Bán đa kênh — điều hành theo lãi thật.'}
            </h1>
            <p className="gtm-sub">
              {en
                ? 'Browse conversion-ready templates, then run Website, Social, Live, POS and marketplaces on one OS.'
                : 'Chọn template đo được CVR — rồi bán Website, Social, Live, POS và sàn trên một OS. Đo lãi thật, không chỉ GMV.'}
            </p>
            <div className="gtm-hero-actions">
              <Link className="gtm-btn gtm-btn-primary" href="/templates">
                {en ? 'Browse templates' : 'Xem templates'}
              </Link>
              <a className="gtm-btn gtm-btn-ghost-ink" href="#demo">
                {en ? 'Book a demo' : 'Đặt demo'}
              </a>
            </div>
          </div>

          <div className="gtm-hero-plane" aria-hidden>
            <div className="gtm-hero-plane-inner">
              <div className="gtm-hp-kpi">
                <div className="l">Contribution margin</div>
                <div className="v">32.4%</div>
                <div className="d">+2.1đ · sau return, fee & commission</div>
              </div>
              <div className="gtm-hp-row">
                <div className="gtm-hp-mini">
                  Net revenue<b>₫1.84 tỷ</b>
                </div>
                <div className="gtm-hp-mini">
                  Đơn rủi ro<b>18</b>
                </div>
              </div>
              <div className="gtm-hp-chan">
                <div className="ln">
                  <span className="lbl">Live</span>
                  <div className="trk">
                    <div className="fill" style={{ ['--w' as string]: '90%' }} />
                  </div>
                  <span>GMV</span>
                </div>
                <div className="ln">
                  <span className="lbl">Live</span>
                  <div className="trk">
                    <div className="fill g" style={{ ['--w' as string]: '38%' }} />
                  </div>
                  <span>Margin</span>
                </div>
                <div className="ln">
                  <span className="lbl">Web</span>
                  <div className="trk">
                    <div className="fill" style={{ ['--w' as string]: '62%' }} />
                  </div>
                  <span>GMV</span>
                </div>
                <div className="ln">
                  <span className="lbl">Web</span>
                  <div className="trk">
                    <div className="fill g" style={{ ['--w' as string]: '74%' }} />
                  </div>
                  <span>Margin</span>
                </div>
              </div>
              <div className="gtm-hp-spark">
                <svg viewBox="0 0 240 56" preserveAspectRatio="none">
                  <path
                    className="gtm-spark-line"
                    d="M0 44 C28 42 36 18 58 22 C82 26 90 48 118 40 C146 32 158 8 188 14 C210 18 224 28 240 20"
                  />
                  <path
                    className="gtm-spark-fill"
                    d="M0 44 C28 42 36 18 58 22 C82 26 90 48 118 40 C146 32 158 8 188 14 C210 18 224 28 240 20 V56 H0 Z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gtm-proof gtm-reveal">
        <div className="gtm-proof-grid">
          <div>
            <div className="n">1 OS</div>
            <div className="t">Commerce · Website · AI · Margin</div>
          </div>
          <div>
            <div className="n">5+</div>
            <div className="t">{en ? 'Sales channels in sync' : 'Kênh bán đồng bộ realtime'}</div>
          </div>
          <div>
            <div className="n">15+</div>
            <div className="t">{en ? 'Carriers & COD' : 'Nhà vận chuyển & COD'}</div>
          </div>
          <div>
            <div className="n">12+</div>
            <div className="t">{en ? 'Payments / QR' : 'Cổng thanh toán / QR'}</div>
          </div>
        </div>
      </section>

      <section className="gtm-sec gtm-channels" id="channels">
        <div className="gtm-narrow">
          <div className="gtm-sec-h gtm-reveal">
            <div className="gtm-eyebrow">Omnichannel</div>
            <h2>
              {en
                ? 'Sell everywhere — control margin per channel.'
                : 'Bán hàng đa kênh dễ dàng — kiểm soát lãi từng kênh.'}
            </h2>
            <p>
              {en
                ? 'Web, Social, Live, POS, marketplaces — plus margin, inventory reservation, and go-live governance.'
                : 'Đủ Web, Social, Live, POS, sàn. PTT thêm lớp margin, reservation tồn và go-live governance.'}
            </p>
          </div>

          <div className="gtm-tabs gtm-reveal" role="tablist">
            {CHANNELS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={tab === c.id}
                className={tab === c.id ? 'on' : ''}
                onClick={() => setTab(c.id)}
              >
                {c.tab}
              </button>
            ))}
          </div>

          <div className="gtm-tab-layout gtm-reveal" role="tabpanel" key={active.id}>
            <div>
              <h3>{active.title}</h3>
              <p className="gtm-lead">{active.lead}</p>
              <ul className="gtm-bullet">
                {active.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <div className="gtm-tab-actions">
                <a className="gtm-btn gtm-btn-primary" href={active.primary.href}>
                  {active.primary.label}
                </a>
                {'secondary' in active && active.secondary ? (
                  <Link className="gtm-btn gtm-btn-ghost-ink" href={active.secondary.href}>
                    {active.secondary.label}
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="gtm-viz">
              <ChannelScene scene={active.viz.scene} />
              <div className="gtm-viz-meta">
                <div className="row">
                  <span>{active.viz.top}</span>
                  <span>{active.viz.meta}</span>
                </div>
                <div className="big">{active.viz.big}</div>
                {'note' in active.viz && active.viz.note ? (
                  <p className="note">{active.viz.note}</p>
                ) : null}
                {'bars' in active.viz && active.viz.bars ? (
                  <div className="bars">
                    <span style={{ ['--h' as string]: '50%' }} />
                    <span style={{ ['--h' as string]: '30%' }} />
                    <span style={{ ['--h' as string]: '65%' }} />
                    <span style={{ ['--h' as string]: '25%' }} />
                  </div>
                ) : !('note' in active.viz) ? (
                  <div className="bars">
                    <span style={{ ['--h' as string]: '40%' }} />
                    <span style={{ ['--h' as string]: '70%' }} />
                    <span style={{ ['--h' as string]: '55%' }} />
                    <span style={{ ['--h' as string]: '88%' }} />
                    <span style={{ ['--h' as string]: '62%' }} />
                    <span style={{ ['--h' as string]: '45%' }} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gtm-contrast" id="margin">
        <div className="gtm-reveal">
          <div className="strike">+120% GMV</div>
          <div className="win">−8% margin</div>
        </div>
        <div className="gtm-reveal">
          <div className="gtm-eyebrow">Revenue Intelligence</div>
          <h2>
            {en
              ? 'Pretty reports are not enough to run the P&L.'
              : 'Báo cáo đẹp không đủ để điều hành.'}
          </h2>
          <p>
            {en
              ? 'PTT subtracts COGS, marketplace fees, COD fail, returns, KOL commission and shipping subsidy before you scale a channel.'
              : 'PTT trừ COGS, fee sàn, COD fail, return, commission KOL và subsidy vận chuyển trước khi bạn tăng ngân sách kênh.'}
          </p>
        </div>
      </section>

      <section className="gtm-sec" id="graph">
        <div className="gtm-narrow">
          <div className="gtm-sec-h gtm-reveal">
            <div className="gtm-eyebrow">{en ? 'PTT difference' : 'Khác biệt PTT'}</div>
            <h2>Revenue Graph</h2>
            <p>
              {en
                ? 'From creative to contribution profit — versioned formulas, no history rewrite.'
                : 'Từ creative đến contribution profit — công thức có version, không rewrite lịch sử.'}
            </p>
          </div>
          <div className="gtm-graph gtm-reveal">
            {GRAPH.map((node, i) => (
              <span
                key={node}
                className="gtm-graph-piece"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <span className={`node${i === GRAPH.length - 1 ? ' hot' : ''}`}>{node}</span>
                {i < GRAPH.length - 1 ? <span className="arr">→</span> : null}
              </span>
            ))}
          </div>
          <div className="gtm-tab-actions gtm-reveal" style={{ marginTop: 28 }}>
            <a className="gtm-btn gtm-btn-primary" href="#demo">
              {en ? 'See Revenue Intelligence' : 'Mở Revenue Intelligence'}
            </a>
            <Link className="gtm-btn gtm-btn-ghost-ink" href="/templates">
              Website playbooks
            </Link>
          </div>
        </div>
      </section>

      <section className="gtm-sec gtm-crm" id="crm">
        <div className="gtm-narrow gtm-split">
          <div className="gtm-sec-h gtm-reveal" style={{ margin: 0 }}>
            <div className="gtm-eyebrow">CRM & Retention</div>
            <h2>
              {en
                ? 'Lifetime customers — measurable LTV:CAC.'
                : 'Nuôi dưỡng khách trọn đời — đo được LTV:CAC.'}
            </h2>
            <p>
              {en
                ? 'Customer 360, RFM, loyalty, multi-channel broadcast. Journeys with holdout and ROI — not just open rate.'
                : 'Customer 360, RFM, loyalty, broadcast đa kênh. Journey có holdout và ROI, không chỉ open rate.'}
            </p>
            <div style={{ marginTop: 24 }}>
              <a className="gtm-btn gtm-btn-primary" href="#demo">
                {en ? 'See 360 profile' : 'Xem hồ sơ 360'}
              </a>
            </div>
          </div>
          <ul className="gtm-feat-lines gtm-reveal">
            {CRM.map((c) => (
              <li key={c.n}>
                <span className="num">{c.n}</span>
                <div>
                  <strong>{c.t}</strong>
                  <span>{c.d}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="gtm-sec gtm-ai" id="ai">
        <div className="gtm-narrow">
          <div className="gtm-sec-h gtm-reveal">
            <div className="gtm-eyebrow">AI Platform</div>
            <h2>
              {en
                ? 'AI that sells 24/7 — with policy, approval, and audit.'
                : 'AI bán hàng 24/7 — có policy, approval và audit.'}
            </h2>
            <p>
              {en
                ? 'Not just a chatbot. Agents have tool permissions, risk classes, and human-in-the-loop. No auto refund or price change.'
                : 'Không chỉ chatbot. Agent có tool permission, risk class và human-in-the-loop. Không tự refund hay đổi giá.'}
            </p>
          </div>
          <div className="gtm-ai-grid gtm-reveal">
            {AI.map((a) => (
              <article key={a.title}>
                <div className="tag">{a.tag}</div>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="gtm-sec" id="ops">
        <div className="gtm-narrow">
          <div className="gtm-sec-h gtm-reveal">
            <div className="gtm-eyebrow">Operations</div>
            <h2>
              {en
                ? 'Orders · inventory · shipping · payments · e-invoice'
                : 'Đơn · tồn · vận chuyển · thanh toán · hóa đơn'}
            </h2>
            <p>
              {en
                ? 'One system from online to offline — COD reconciliation and multi-channel e-invoice.'
                : 'Một hệ thống từ online đến offline — COD đối soát và e-invoice đa kênh.'}
            </p>
          </div>
          <div className="gtm-ops gtm-reveal">
            {OPS.map((o) => (
              <div key={o.t}>
                <h3>{o.t}</h3>
                <p>{o.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gtm-sec gtm-logos-sec">
        <div className="gtm-narrow">
          <p className="gtm-logos-label">
            {en ? 'Vietnam ecosystem' : 'Kết nối hệ sinh thái Việt Nam'}
          </p>
          <div className="gtm-logos gtm-reveal">
            {[
              'Shopee',
              'Lazada',
              'TikTok Shop',
              'Tiki',
              'Meta',
              'Zalo OA',
              'GHN',
              'GHTK',
              'Viettel Post',
              'MoMo',
              'VNPay',
              'ZaloPay',
            ].map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="gtm-sec gtm-demo" id="demo">
        <div className="gtm-narrow gtm-demo-grid">
          <div className="gtm-sec-h gtm-reveal" style={{ margin: 0 }}>
            <div className="gtm-eyebrow">{en ? 'Get started' : 'Bắt đầu'}</div>
            <h2>
              {en
                ? 'Book a 30-minute demo for your industry'
                : 'Đặt demo 30 phút theo ngành của bạn'}
            </h2>
            <p>
              {en
                ? 'Tour Command Center, Website Go-live, and Social/Live. Sales Copilot summarizes pain before the call.'
                : 'Nhận tour Command Center, Website Go-live và Social/Live. Sales Copilot tóm tắt pain trước cuộc gọi.'}
            </p>
            <ul className="gtm-bullet">
              <li>Beauty / D2C / Agency / B2B playbook</li>
              <li>{en ? 'Margin vs GMV-only comparison' : 'So sánh margin vs chỉ nhìn GMV'}</li>
              <li>{en ? 'Sandbox storefront in week one' : 'Sandbox storefront trong tuần đầu'}</li>
            </ul>
          </div>
          <div className="gtm-reveal">
            <LeadForm ctaCode="cta_book_demo" landingSlug={en ? '/en' : '/'} />
          </div>
        </div>
      </section>
    </div>
  );
}
