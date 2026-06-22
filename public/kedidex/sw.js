/* KediDex — servis çalışanı (uygulama kabuğu; same-origin için network-first) */
const CACHE = 'kedidex-v3';
const SHELL = [
  './', './index.html', './styles.css',
  './storage.js', './catgen.js', './detector.js', './mapview.js', './app.js',
  './manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;             // POST/api: dokunma
  if (url.origin !== location.origin) return;         // CDN/karolar: ağ
  if (url.pathname.startsWith('/api/')) return;        // backend: ağ
  // same-origin kabuk: network-first (çevrimiçi hep güncel, çevrimdışı cache)
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
