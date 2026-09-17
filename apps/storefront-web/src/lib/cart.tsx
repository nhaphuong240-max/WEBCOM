'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { storeApi, STOREFRONT_ID } from './api';

type CartLine = {
  id: string;
  sku_id: string;
  title: string;
  qty: number;
  unit_price: string;
  line_total: string;
};

type Cart = {
  id: string;
  lines: CartLine[];
  total: string;
  subtotal: string;
};

type CartCtx = {
  cart: Cart | null;
  qty: number;
  refresh: () => Promise<void>;
  addItem: (skuId: string, qty?: number) => Promise<void>;
  ensureCart: () => Promise<string>;
  clearLocal: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = 'aura_cart_id';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);

  const refresh = useCallback(async () => {
    const id = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!id) {
      setCart(null);
      return;
    }
    try {
      const c = await storeApi<Cart>(`/v1/carts/${id}`, { cache: 'no-store' });
      if (c && (c as { status?: string }).status === 'converted') {
        localStorage.removeItem(KEY);
        setCart(null);
        return;
      }
      setCart(c);
    } catch {
      localStorage.removeItem(KEY);
      setCart(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ensureCart = useCallback(async () => {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const created = await storeApi<Cart>('/v1/carts', {
      method: 'POST',
      cache: 'no-store',
      body: JSON.stringify({ storefront_id: STOREFRONT_ID }),
    });
    localStorage.setItem(KEY, created.id);
    setCart(created);
    return created.id;
  }, []);

  const addItem = useCallback(
    async (skuId: string, qty = 1) => {
      const id = await ensureCart();
      const updated = await storeApi<Cart>(`/v1/carts/${id}/items`, {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify({ sku_id: skuId, qty }),
      });
      setCart(updated);
      const { trackEvent } = await import('./analytics');
      void trackEvent({
        name: 'add_to_cart',
        payload: { sku_id: skuId, qty },
      });
    },
    [ensureCart],
  );

  const clearLocal = useCallback(() => {
    localStorage.removeItem(KEY);
    setCart(null);
  }, []);

  const qty = useMemo(() => cart?.lines.reduce((s, l) => s + l.qty, 0) ?? 0, [cart]);

  const value = useMemo(
    () => ({ cart, qty, refresh, addItem, ensureCart, clearLocal }),
    [cart, qty, refresh, addItem, ensureCart, clearLocal],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error('CartProvider missing');
  return v;
}
