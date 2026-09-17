/* W5 offline shell — cache app shell only */
const CACHE = 'aura-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Network-first for pages; cache fallback to offline shell
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/offline.html').then((r) => r || caches.match('/'))),
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      if (res.ok && (url.pathname.startsWith('/_next/static') || url.pathname.endsWith('.webmanifest'))) {
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});

self.addEventListener('push', (event) => {
  // Push consent stub — payload ignored until FCM wired
  const data = event.data ? event.data.text() : 'AURA cập nhật mới';
  event.waitUntil(self.registration.showNotification('AURA Beauty', { body: data, icon: '/icons/icon-192.png' }));
});
