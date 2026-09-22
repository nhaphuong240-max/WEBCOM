import { Badge, Button, Kpi, PageHeader, Panel } from '@ptt/ui';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { websiteNav } from '@/lib/nav';

export const dynamic = 'force-dynamic';

type OrderRow = {
  id?: string;
  code?: string;
  attribution_channel?: string | null;
  payment_status?: string;
  status?: string;
  total?: number | string | { amount?: number };
  shipping?: { phone?: string; name?: string };
};

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

function maskPhone(phone?: string, name?: string) {
  if (phone && phone.length >= 7) return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
  return name || '—';
}

function orderTotal(o: OrderRow): number {
  if (typeof o.total === 'number') return o.total;
  if (typeof o.total === 'string') return Number(o.total) || 0;
  if (o.total && typeof o.total === 'object' && typeof o.total.amount === 'number') return o.total.amount;
  return 0;
}


const EXCEPTIONS = [
  {
    tone: 'danger' as const,
    type: 'COD',
    detail: '12 đơn giao thất bại · quận 12',
    sla: '2h',
    href: '/orders',
    action: 'Xử lý',
  },
  {
    tone: 'warn' as const,
    type: 'Tồn',
    detail: 'SKU SERUM-30 oversell risk Live',
    sla: '45p',
    href: '/inventory',
    action: 'Giữ',
  },
  {
    tone: 'accent' as const,
    type: 'Publish',
    detail: 'Go-live fail · Meta Pixel consent',
    sla: '—',
    href: '/website/golive',
    action: 'Checklist',
  },
  {
    tone: 'muted' as const,
    type: 'AI',
    detail: '3 action chờ duyệt · discount > 25%',
    sla: '1h',
    href: '/recovery',
    action: 'Duyệt',
  },
];

const AI_INSIGHTS = [
  {
    title: 'Giảm budget Live SET A 15%',
    body: 'GMV cao nhưng contribution chỉ 11% sau return 18% và commission. Evidence: 14 ngày gần nhất.',
    primary: { label: 'Phê duyệt', href: '/revenue' },
    secondary: 'Bỏ qua',
  },
  {
    title: 'Đẩy bundle Serum + Toner lên PDP',
    body: 'AOV +₫186k trên cohort mobile; margin bundle 38%. Draft page — không tự publish.',
    primary: { label: 'Mở draft', href: '/website/builder' },
    secondary: 'Bỏ qua',
  },
  {
    title: 'Gọi lại 42 khách COD trễ',
    body: 'Risk medium · tạo task CSKH. Agent không tự gửi ZNS hàng loạt.',
    primary: { label: 'Tạo task', href: '/customers' },
    secondary: 'Bỏ qua',
  },
];

const CHANNELS = [
  { lab: 'Website', gmv: 62, margin: 74 },
  { lab: 'Live', gmv: 90, margin: 38 },
  { lab: 'POS', gmv: 48, margin: 70 },
  { lab: 'Shopee', gmv: 72, margin: 28 },
  { lab: 'TikTok', gmv: 80, margin: 33 },
];

const DEMO_ORDERS = [
  { code: 'ORD-9182', source: 'Live', customer: '0903***221', pay: 'COD', payTone: 'warn' as const, total: '₫890.000' },
  { code: 'ORD-9181', source: 'Web', customer: 'an@email', pay: 'Paid', payTone: 'signal' as const, total: '₫1.240.000' },
  { code: 'ORD-9180', source: 'Zalo', customer: '0988***019', pay: 'Draft', payTone: 'muted' as const, total: '₫450.000' },
  { code: 'ORD-9179', source: 'POS', customer: 'Member Gold', pay: 'Paid', payTone: 'signal' as const, total: '₫620.000' },
];

export default async function CommandCenterPage() {
  let recent = DEMO_ORDERS;
  try {
    const rows = await apiGet<OrderRow[] | { items?: OrderRow[] }>('/v1/admin/orders');
    const list = Array.isArray(rows) ? rows : rows.items || [];
    if (list.length) {
      recent = list.slice(0, 4).map((o, i) => {
        const total = orderTotal(o);
        const pay = String(o.payment_status || o.status || '—');
        const payLower = pay.toLowerCase();
        const payTone =
          payLower.includes('paid') || payLower.includes('confirmed')
            ? ('signal' as const)
            : payLower.includes('cod')
              ? ('warn' as const)
              : ('muted' as const);
        return {
          code: o.code || o.id?.slice(0, 12) || `ORD-${9182 - i}`,
          source: o.attribution_channel || 'Web',
          customer: maskPhone(o.shipping?.phone, o.shipping?.name),
          pay,
          payTone,
          total: total ? formatVnd(total) : '—',
        };
      });
    }
  } catch {
    /* demo fallback */
  }

  return (
    <>
      <PageHeader
        title="Điều hành theo lãi thật"
        description="GMV cao không đồng nghĩa margin khỏe. Ưu tiên exception và AI action cần duyệt trước khi tối ưu campaign."
        actions={
          <select
            aria-label="Khoảng thời gian"
            defaultValue="today"
            style={{
              height: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--ptt-line)',
              background: 'var(--ptt-surface)',
              font: 'inherit',
              fontSize: 13,
              minWidth: 140,
            }}
          >
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
          </select>
        }
      />

      <Panel
        title="CMS template · vào nhanh"
        action={
          <Link href="/website/builder" style={{ fontSize: 12, color: 'var(--ptt-accent)', fontWeight: 600 }}>
            Mở Site Builder →
          </Link>
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <Link href="/website/builder">
            <Button variant="primary" size="sm">
              CMS · Site Builder
            </Button>
          </Link>
          <Link href="/website/templates">
            <Button variant="ghost" size="sm">
              Template Store
            </Button>
          </Link>
          <Link href="/website/themes">
            <Button variant="ghost" size="sm">
              Theme Library
            </Button>
          </Link>
          <span style={{ fontSize: 12, color: 'var(--ptt-ink-3)' }}>
            Menu trái: <strong>Website · CMS</strong>
          </span>
        </div>
      </Panel>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 18,
          marginTop: 18,
        }}
        className="cc-kpi-row"
      >
        <Kpi label="Contribution margin" value="32.4%" delta="↑ 2.1đ · sau return & fee" emphasis />
        <Kpi label="Net revenue" value="₫1.84 tỷ" delta="↑ 12% WoW" />
        <Kpi label="Đơn rủi ro" value="18" delta={<span style={{ color: 'var(--ptt-danger)' }}>↑ 4 COD / tồn</span>} />
        <Kpi label="Checkout CVR" value="3.8%" delta="↑ 0.4đ mobile" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }} className="cc-grid-2">
        <Panel
          title="Exception queue"
          action={
            <Link href="/orders" style={{ fontSize: 12, color: 'var(--ptt-accent)', fontWeight: 600 }}>
              Xem tất cả
            </Link>
          }
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, margin: '-6px 0' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ptt-ink-3)', fontSize: 11 }}>
                <th style={{ padding: '8px 4px', fontWeight: 600 }}>Loại</th>
                <th style={{ padding: '8px 4px', fontWeight: 600 }}>Chi tiết</th>
                <th style={{ padding: '8px 4px', fontWeight: 600 }}>SLA</th>
                <th style={{ padding: '8px 4px' }} />
              </tr>
            </thead>
            <tbody>
              {EXCEPTIONS.map((ex) => (
                <tr key={ex.type} style={{ borderTop: '1px solid var(--ptt-paper-2)' }}>
                  <td style={{ padding: '12px 4px' }}>
                    <Badge tone={ex.tone}>{ex.type}</Badge>
                  </td>
                  <td style={{ padding: '12px 4px' }}>{ex.detail}</td>
                  <td style={{ padding: '12px 4px', color: 'var(--ptt-ink-3)', whiteSpace: 'nowrap' }}>{ex.sla}</td>
                  <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                    <Link href={ex.href}>
                      <Button variant={ex.type === 'AI' ? 'primary' : 'ghost'} size="sm">
                        {ex.action}
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="AI Insight · Human-in-the-loop" action={<Badge tone="muted">Policy on</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: '-6px 0' }}>
            {AI_INSIGHTS.map((item) => (
              <div
                key={item.title}
                style={{
                  padding: '14px 0',
                  borderBottom: '1px solid var(--ptt-paper-2)',
                }}
              >
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{item.title}</h4>
                <p style={{ fontSize: 12, color: 'var(--ptt-ink-3)', margin: '0 0 10px', lineHeight: 1.45 }}>
                  {item.body}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={item.primary.href}>
                    <Button variant="primary" size="sm">
                      {item.primary.label}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm">
                    {item.secondary}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }} className="cc-grid-2">
        <Panel
          title="GMV vs Margin theo kênh"
          action={<span style={{ fontSize: 12, color: 'var(--ptt-ink-3)', fontWeight: 400 }}>Live bán chạy ≠ Live lãi</span>}
        >
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--ptt-ink-3)', marginBottom: 12 }}>
            <span>
              <i
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  marginRight: 4,
                  background: 'var(--ptt-ink-3)',
                }}
              />
              GMV
            </span>
            <span>
              <i
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  marginRight: 4,
                  background: 'var(--ptt-signal)',
                }}
              />
              Contribution margin
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {CHANNELS.map((ch) => (
              <div
                key={ch.lab}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '72px 1fr 1fr',
                  gap: 10,
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 600 }}>{ch.lab}</span>
                <div style={{ height: 8, background: 'var(--ptt-paper-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${ch.gmv}%`, background: 'var(--ptt-ink-3)' }} />
                </div>
                <div style={{ height: 8, background: 'var(--ptt-paper-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${ch.margin}%`, background: 'var(--ptt-signal)' }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Đơn gần đây"
          action={
            <Link href="/live" style={{ fontSize: 12, color: 'var(--ptt-accent)', fontWeight: 600 }}>
              Social console
            </Link>
          }
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, margin: '-6px 0' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ptt-ink-3)', fontSize: 11 }}>
                <th style={{ padding: '8px 4px' }}>Mã</th>
                <th style={{ padding: '8px 4px' }}>Nguồn</th>
                <th style={{ padding: '8px 4px' }}>KH</th>
                <th style={{ padding: '8px 4px' }}>TT</th>
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Giá trị</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.code} style={{ borderTop: '1px solid var(--ptt-paper-2)' }}>
                  <td style={{ padding: '12px 4px', fontWeight: 600 }}>
                    <Link href="/orders" style={{ color: 'inherit' }}>
                      {o.code}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 4px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--ptt-paper-2)',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {o.source}
                    </span>
                  </td>
                  <td style={{ padding: '12px 4px', color: 'var(--ptt-ink-3)' }}>{o.customer}</td>
                  <td style={{ padding: '12px 4px' }}>
                    <Badge tone={o.payTone}>{o.pay}</Badge>
                  </td>
                  <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 600 }}>{o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Website Commerce · quick links" action={<Badge tone="muted">mockup map</Badge>}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {websiteNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--ptt-line)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ptt-ink)',
                background: 'var(--ptt-paper)',
              }}
            >
              {item.label}
              <Badge tone="muted">{item.mockup}</Badge>
            </Link>
          ))}
        </div>
      </Panel>

      <style>{`
        @media (max-width: 1100px) {
          .cc-kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .cc-grid-2 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .cc-kpi-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
