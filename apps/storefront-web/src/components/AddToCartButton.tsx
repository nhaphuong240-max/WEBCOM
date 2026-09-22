'use client';

import { useTransition } from 'react';
import { useCart } from '../lib/cart';

export function AddToCartButton({
  skuId,
  disabled,
  label = 'Thêm vào giỏ',
}: {
  skuId: string;
  disabled?: boolean;
  label?: string;
}) {
  const { addItem } = useCart();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          await addItem(skuId, 1);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('ptt:mini-cart-open'));
          }
        })
      }
      style={{
        width: '100%',
        height: 44,
        border: 'none',
        borderRadius: 8,
        background: disabled ? '#ccc' : '#c45a6a',
        color: '#fff',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {pending ? 'Đang thêm…' : label}
    </button>
  );
}
