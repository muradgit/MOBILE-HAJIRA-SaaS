const CACHE_NAME = 'mobile-hajira-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll with caution, if one fails the whole install fails
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn("Failed to cache some assets during install:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass Service Worker for internal Next.js/Vite development requests
  if (
    url.pathname.includes('/_next/webpack-hmr') || 
    url.pathname.includes('/__nextjs_launcher') ||
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // 2. Handle Navigation requests: Network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/').then(response => response || Response.error());
      })
    );
    return;
  }

  // 3. Skip caching for RSC payloads and API routes
  if (
    url.searchParams.has('_rsc') || 
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('/_next/data/')
  ) {
    return; // Let browser handle it normally
  }

  // 4. Cache-first strategy for static assets
  const isStatic = ASSETS_TO_CACHE.includes(url.pathname) || 
                   url.pathname.startsWith('/icons/') ||
                   url.pathname.endsWith('.png') ||
                   url.pathname.endsWith('.jpg') ||
                   url.pathname.endsWith('.svg');

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. Default strategy: Network only (do nothing and let it pass through)
});
