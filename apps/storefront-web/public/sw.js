/* Themes storefront SW — network-first; never trap users on stale offline */
const CACHE = 'ptt-themes-shell-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Always network for navigations — do not fall back to offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(
            '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Mất kết nối</title></head><body style="font-family:system-ui;display:grid;place-items:center;min-height:100dvh;margin:0"><main style="text-align:center;padding:24px"><h1>Mất kết nối tạm thời</h1><p><a href="/clear-pwa.html">Gỡ cache PWA</a> · <a href="/">Thử lại</a></p></main></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          ),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && url.pathname.startsWith('/_next/static')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || Response.error())),
  );
});
