/* ─────────────────────────────────────────────
   NOVA BLAST — Service Worker (PWA)
   Caches all game assets for offline play
───────────────────────────────────────────── */

const CACHE_NAME = 'novablast-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&family=Inter:wght@400;500;600&display=swap',
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets; fonts may fail offline (acceptable)
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first with network fallback
self.addEventListener('fetch', e => {
  // Skip non-GET and chrome-extension requests
  if (e.request.method !== 'GET' || e.request.url.startsWith('chrome-extension://')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Only cache valid responses for same-origin or fonts
        if (!response || response.status !== 200) return response;
        const url = new URL(e.request.url);
        const isSameOrigin = url.origin === self.location.origin;
        const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
        if (isSameOrigin || isFont) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return cached index for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
