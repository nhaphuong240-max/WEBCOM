'use client';

import { useEffect } from 'react';
import { useConsentGranted } from './ConsentBanner';

/** Loads GTM/Pixel only after consent (E-W2-05). */
export function TrackingPixels({
  gtmId,
  pixelId,
}: {
  gtmId?: string | null;
  pixelId?: string | null;
}) {
  const granted = useConsentGranted();

  useEffect(() => {
    if (!granted) return;
    if (gtmId && !document.getElementById('ptt-gtm')) {
      const s = document.createElement('script');
      s.id = 'ptt-gtm';
      s.innerHTML = `window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});console.info('[PTT] GTM stub', '${gtmId}');`;
      document.head.appendChild(s);
    }
    if (pixelId && !document.getElementById('ptt-pixel')) {
      const s = document.createElement('script');
      s.id = 'ptt-pixel';
      s.innerHTML = `console.info('[PTT] Meta Pixel stub + CAPI gate', '${pixelId}');`;
      document.head.appendChild(s);
    }
  }, [granted, gtmId, pixelId]);

  return null;
}
