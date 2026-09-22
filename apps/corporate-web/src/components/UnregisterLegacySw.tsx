'use client';

import { useEffect } from 'react';

/**
 * Apex used to host AURA storefront PWA. Browsers may still have
 * `aura-shell-v1` SW → shows "Bạn đang offline" even when corporate is up.
 * Unregister + clear caches, then register kill-switch /sw.js once.
 */
export function UnregisterLegacySw() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        /* ignore */
      }
      try {
        if (window.caches) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* ignore */
      }
      // Install kill-switch SW so any update cycle clears old AURA shell
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return null;
}
