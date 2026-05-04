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

// Push Notification Support
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'Mobile Hajira', body: 'নতুন একটি নোটিফিকেশন এসেছে' };
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
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
    url.pathname.includes('/_next/data/') ||
    event.request.headers.get('RSC') === '1'
  ) {
    // For RSC, try network first, then return a fallback if offline to avoid the "Failed to fetch RSC payload" error
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return a 200 OK empty response or a cached version if possible
        // but for RSC, sometimes returning an error is better handled by Next.js if we can't provide a valid payload.
        // However, to satisfy the browser and avoid console spam:
        return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            // If it's the home page payload, we might have it cached as index.html
            // but for specific RSC paths, returning null/empty might break things.
            // Still, a response is better than a fetch error.
            return new Response('', { status: 503, statusText: 'Service Unavailable (Offline)' });
        });
      })
    );
    return;
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
