// Service Worker for IEEE DTU DSA Tracker PWA
const CACHE_NAME = 'dsa-tracker-v1';
const OFFLINE_URL = '/offline';

// App shell resources to pre-cache on install
const APP_SHELL = [
  '/',
  '/offline',
  '/manifest.json',
];

// Install event: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate new SW immediately
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event: network-first for navigation/API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Navigation requests (HTML pages): network-first, fallback to cache or offline page
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Static assets (JS, CSS, images): stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Network-first strategy with cache fallback (for API calls)
async function networkFirstWithCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(
      JSON.stringify({ error: { code: 'OFFLINE', message: 'You are offline and no cached data is available.' } }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Navigation handler: network-first, fallback to cached page or offline page
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful navigation responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Serve offline fallback page
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

// Stale-while-revalidate strategy (for static assets)
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, networkResponse.clone());
        });
      }
      return networkResponse;
    })
    .catch(() => null);

  return cachedResponse || (await fetchPromise) || new Response('Offline', { status: 503 });
}

// Background Sync: sync pending data when connectivity is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  try {
    // Notify all clients to trigger data sync
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_PENDING_DATA' });
    });
  } catch (error) {
    // Retry will happen on next sync event
    console.error('Background sync failed:', error);
  }
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
