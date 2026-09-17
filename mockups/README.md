# PTT UI Mockup Suite

Bộ HTML mockup theo SRS v5.1 / Architecture v3 — thiết kế để **thắng UI omnichannel phổ biến (Haravan)** bằng hierarchy, margin-first và website governance.

## Mở nhanh

Mở file [`index.html`](./index.html) trong trình duyệt (cần mạng lần đầu để tải Google Fonts).

```bash
open mockups/index.html
# hoặc
npx serve mockups
```

## Danh sách màn hình

| File | Màn hình | Điểm thắng UI |
|---|---|---|
| `01-corporate-gtm.html` | Corporate GTM | Brand-first hero, narrative “có lãi” |
| `02-onboarding.html` | Website onboarding | Wizard Brand Kit → Theme Match → Go-live |
| `03-admin-command-center.html` | Command Center | Margin KPI + exception + AI approval |
| `04-template-marketplace.html` | Template Store | Conversion/Mobile/SEO score + AI Match |
| `05-theme-library.html` | Theme Library | Staging / publish / rollback |
| `06-visual-site-builder.html` | Site Builder | Schema builder + AI copy, không tự publish |
| `07-golive-checklist.html` | Go-live gate | Block publish khi fail checkout/CWV |
| `08-storefront-beauty.html` | Storefront Beauty | Mobile-first PDP + sticky ATC |
| `09-website-analytics.html` | Web Analytics | Funnel + margin theo page + CWV |
| `10-social-live-console.html` | Social/Live | Inbox đa kênh + keyword order |
| `11-revenue-intelligence.html` | Revenue Graph | Contribution profit, không chỉ GMV |
| `12-creator-scorecard.html` | Creator Studio | KOL margin / return / payout |

## Design system

- File: `ptt-design.css`
- Display: **Syne** · Body: **Be Vietnam Pro**
- Ink `#0b1420` · Accent `#ff5c1a` · Signal `#0d8f6b` · Paper `#f3f5f7`
- Tránh: purple SaaS, cream+terracotta, Inter/Roboto, emoji, glow, pill cluster

## Luồng demo GTM

```text
Corporate → Onboarding → Template → Theme → Builder → Go-live → Storefront
→ Command Center → Analytics → Social/Live → Revenue → Creator
```
