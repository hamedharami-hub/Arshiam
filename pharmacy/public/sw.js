/**
 * Progressive Web App (PWA) Service Worker
 * Australian Pharmacy Practice Simulator (AU Pharmacy)
 * High-Performance Offline Caching Engine
 */

const CACHE_NAME = 'au-pharmacy-offline-v2';

// Core Application Shell Assets to Pre-cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// 1. INSTALL EVENT: Pre-cache core shell & activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW] Pre-cache initial warning:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE EVENT: Remove outdated caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Purging outdated cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. FETCH EVENT: Intelligent Caching Strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore non-HTTP protocols (browser extensions, etc.)
  if (!url.protocol.startsWith('http')) return;

  // A. AI & Backend API routes: Network-First with offline JSON fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            offline: true,
            error: 'شما در حالت آفلاین هستید. قابلیت‌های هوش مصنوعی نیازمند اتصال به اینترنت هستند.',
            message: 'You are currently offline. AI features require an internet connection.',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }
        );
      })
    );
    return;
  }

  // B. Next.js Page Navigation (HTML): Network-First, fallback to cached '/' shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Match current request ignoring query params (e.g. ?module=1, ?source=pwa)
          const cachedSpecific = await caches.match(request, { ignoreSearch: true });
          if (cachedSpecific) return cachedSpecific;

          // Fallback to cached root shell
          const cachedRoot = await caches.match('/', { ignoreSearch: true });
          if (cachedRoot) return cachedRoot;

          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>آفلاین | AU Pharmacy</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;background:#09090B;color:#fafafa"><h2>شما در حالت آفلاین هستید</h2><p>لطفاً اتصال اینترنت خود را بررسی کنید یا صفحه اصلی را بارگذاری مجدد فرمایید.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // C. Static Assets (Next.js JS Chunks, CSS, Icons, Fonts, Images)
  // Strategy: Stale-While-Revalidate (Fast response from cache, background update)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Silently swallow network errors if offline
          });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // D. General Requests: Network with Cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});

// 4. MESSAGE EVENT: Handle client triggers (Skip waiting, manual pre-cache)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(event.data.urls).catch((err) => {
        console.warn('[SW] Manual CACHE_URLS partial failure:', err);
      });
    });
  }
});
