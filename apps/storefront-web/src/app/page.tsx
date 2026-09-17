'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Badge, Button, Input, PttMark } from '@ptt/ui';
import Link from 'next/link';
import { storeApi, STOREFRONT_ID } from '../lib/api';

type Product = {
  id: string;
  title: string;
  description: string;
  skus: Array<{ id: string; code: string; unit_price: string | null; available: number }>;
};

type Cart = {
  id: string;
  lines: Array<{ id: string; title: string; qty: number; line_total: string }>;
  total: string;
};

type Order = { order_id: string; total: string; status: string };

export default function StorefrontHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const [ship, setShip] = useState({
    name: 'Nguyen Van A',
    phone: '0901234567',
    address: '12 Nguyen Hue, Q1',
    city: 'HCM',
  });

  const qty = useMemo(() => cart?.lines.reduce((s, l) => s + l.qty, 0) ?? 0, [cart]);

  useEffect(() => {
    storeApi<Product[]>('/v1/catalog/products')
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, []);

  function ensureCart(cb: (cartId: string) => Promise<void>) {
    start(async () => {
      try {
        setError('');
        let id = cart?.id;
        if (!id) {
          const created = await storeApi<Cart>('/v1/carts', {
            method: 'POST',
            body: JSON.stringify({ storefront_id: STOREFRONT_ID }),
          });
          setCart(created);
          id = created.id;
        }
        await cb(id);
        const priced = await storeApi<Cart>(`/v1/carts/${id}`);
        setCart(priced);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
      }
    });
  }

  function addToCart(skuId: string) {
    ensureCart(async (cartId) => {
      await storeApi(`/v1/carts/${cartId}/items`, {
        method: 'POST',
        body: JSON.stringify({ sku_id: skuId, qty: 1 }),
      });
    });
  }

  function checkout() {
    if (!cart) return;
    start(async () => {
      try {
        setError('');
        const key = `demo-${cart.id}-${Date.now()}`;
        const result = await storeApi<Order>('/v1/checkout', {
          method: 'POST',
          idempotencyKey: key,
          body: JSON.stringify({
            cart_id: cart.id,
            payment_method: 'COD',
            shipping_name: ship.name,
            shipping_phone: ship.phone,
            shipping_address: ship.address,
            shipping_city: ship.city,
            client_total: 1,
          }),
        });
        setOrder(result);
        setCart(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Checkout failed');
      }
    });
  }

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh' }}>
      <header
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid var(--ptt-line)',
          background: 'rgba(250,248,246,0.92)',
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        <Badge tone="accent">W1</Badge>
        <strong style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 20 }}>AURA</strong>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Giỏ ({qty})</span>
      </header>

      <section
        style={{
          minHeight: '42vh',
          padding: '36px 20px',
          color: '#fff',
          background:
            'radial-gradient(circle at 70% 30%, rgba(255,180,160,.55), transparent 45%), linear-gradient(165deg, #1a1514 0%, #3d2c28 40%, #c4a090 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <div style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 42, letterSpacing: '-0.04em' }}>
          AURA
        </div>
        <p style={{ opacity: 0.85, fontSize: 14, maxWidth: '30ch', margin: '8px 0 0' }}>
          Commerce core W1 — browse → cart → checkout COD (server price).
        </p>
      </section>

      <section style={{ padding: 20, display: 'grid', gap: 16 }}>
        {error ? <p style={{ color: 'crimson', fontSize: 13 }}>{error}</p> : null}
        {order ? (
          <div
            style={{
              padding: 16,
              border: '1px solid var(--ptt-line)',
              borderRadius: 12,
              background: 'var(--ptt-surface)',
            }}
          >
            <Badge tone="accent">Đặt hàng thành công</Badge>
            <p style={{ marginTop: 8, fontSize: 14 }}>
              Order <code>{order.order_id}</code> · {order.status} · {order.total} VND
            </p>
            <p style={{ fontSize: 12, color: 'var(--ptt-ink-3)' }}>
              client_total bị bỏ qua (BR-021).
            </p>
          </div>
        ) : null}

        {products.map((p) => {
          const sku = p.skus[0];
          return (
            <article
              key={p.id}
              style={{
                border: '1px solid var(--ptt-line)',
                borderRadius: 12,
                padding: 16,
                background: 'var(--ptt-surface)',
              }}
            >
              <h2 style={{ fontFamily: 'var(--ptt-font-display)', fontSize: 22, margin: 0 }}>
                {p.title}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--ptt-ink-3)', margin: '8px 0' }}>
                {p.description}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{sku?.unit_price} VND</strong>
                  <div style={{ fontSize: 12, color: 'var(--ptt-ink-3)' }}>
                    Còn {sku?.available ?? 0} · {sku?.code}
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!sku || pending || (sku?.available ?? 0) < 1}
                  onClick={() => sku && addToCart(sku.id)}
                >
                  Thêm giỏ
                </Button>
              </div>
            </article>
          );
        })}

        {cart && cart.lines.length > 0 ? (
          <div
            style={{
              border: '1px solid var(--ptt-line)',
              borderRadius: 12,
              padding: 16,
              display: 'grid',
              gap: 10,
            }}
          >
            <strong>Giỏ hàng</strong>
            {cart.lines.map((l) => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>
                  {l.title} × {l.qty}
                </span>
                <span>{l.line_total}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Tổng (server)</span>
              <span>{cart.total}</span>
            </div>
            <Input
              value={ship.name}
              onChange={(e) => setShip((s) => ({ ...s, name: e.target.value }))}
              placeholder="Họ tên"
            />
            <Input
              value={ship.phone}
              onChange={(e) => setShip((s) => ({ ...s, phone: e.target.value }))}
              placeholder="SĐT"
            />
            <Input
              value={ship.address}
              onChange={(e) => setShip((s) => ({ ...s, address: e.target.value }))}
              placeholder="Địa chỉ"
            />
            <Button variant="ink" disabled={pending} onClick={checkout}>
              Thanh toán COD
            </Button>
          </div>
        ) : null}

        <div style={{ fontSize: 12, color: 'var(--ptt-ink-3)' }}>
          <PttMark /> <span style={{ marginLeft: 8 }}>Powered by PTT Storefront</span>
        </div>
        <Link href="http://localhost:3000" style={{ color: 'var(--ptt-accent)', fontWeight: 600, fontSize: 12 }}>
          ← Admin
        </Link>
      </section>
    </div>
  );
}
