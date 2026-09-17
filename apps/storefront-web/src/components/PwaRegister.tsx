'use client';

import { useEffect, useState } from 'react';

export function PwaRegister() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferred, setDeferred] = useState<{ prompt: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as Event & { prompt: () => Promise<void> };
      setDeferred(ev);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  if (!canInstall || !deferred) return null;
  return (
    <button
      type="button"
      onClick={() => {
        void deferred.prompt().then(() => setCanInstall(false));
      }}
      style={{
        position: 'fixed',
        right: 12,
        bottom: 76,
        zIndex: 50,
        height: 36,
        padding: '0 12px',
        borderRadius: 8,
        border: 0,
        background: '#1a1214',
        color: '#fff',
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      Cài app AURA
    </button>
  );
}
