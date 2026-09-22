/* Kill leftover AURA storefront SW on Platform apex — v2 */
const KILL = 'ptt-apex-kill-v2';
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      try { client.navigate('/clear-pwa.html'); } catch (_) { /* ignore */ }
    }
  })());
});
self.addEventListener('fetch', (event) => {
  // Never serve stale offline shell — always network
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => Response.redirect('/clear-pwa.html', 302)),
    );
  }
});
