// CastMatch Service Worker v1.2.0
// Advanced offline functionality and performance optimization for Mumbai entertainment industry professionals

const CACHE_NAME = 'castmatch-v1.2.0';
const DYNAMIC_CACHE = 'castmatch-dynamic-v1.2.0';
const DATA_CACHE = 'castmatch-data-v1.2.0';
const PERFORMANCE_CACHE = 'castmatch-performance-v1.2.0';

// Critical assets for offline functionality
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/_next/static/css/app.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/framework.js',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/pages/_app.js',
  '/_next/static/chunks/pages/index.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  '/api/talents',
  '/api/auditions',
  '/api/profile',
  '/api/notifications'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => {
          return new Request(url, { cache: 'reload' });
        }));
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('[SW] Failed to cache static assets:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('castmatch-') && 
                     cacheName !== CACHE_NAME &&
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== DATA_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/offline');
        })
    );
    return;
  }

  // Default strategy: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    return new Response('Offline content unavailable', { status: 503 });
  }
}

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  const cache = await caches.open(DATA_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, falling back to cache');
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add offline indicator to response
      const responseData = await cachedResponse.json();
      return new Response(JSON.stringify({
        ...responseData,
        offline: true,
        cachedAt: cachedResponse.headers.get('date')
      }), {
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Mode': 'true'
        }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'No cached data available'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.error('[SW] Stale-while-revalidate fetch failed:', error);
    });
  
  return cachedResponse || fetchPromise;
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  return pathname.match(/\.(js|css|woff|woff2|ttf|eot|png|jpg|jpeg|gif|svg|ico|webp|avif)$/);
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notification = {
    title: 'CastMatch',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'castmatch-notification',
    requireInteraction: true
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notification = {
        ...notification,
        ...data
      };
    } catch (e) {
      notification.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notification.title, notification)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window/tab open
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered');
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    // Get offline queue from IndexedDB
    const offlineQueue = await getOfflineQueue();
    
    for (const request of offlineQueue) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body
        });
        
        if (response.ok) {
          await removeFromOfflineQueue(request.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync offline request:', error);
      }
    }
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// IndexedDB helpers for offline queue
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CastMatchOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineQueue')) {
        db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getOfflineQueue() {
  const db = await openDB();
  const tx = db.transaction('offlineQueue', 'readonly');
  const store = tx.objectStore('offlineQueue');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeFromOfflineQueue(id) {
  const db = await openDB();
  const tx = db.transaction('offlineQueue', 'readwrite');
  const store = tx.objectStore('offlineQueue');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data?.type === 'PERFORMANCE_REPORT') {
    console.log('[SW] Performance report received:', event.data.metrics);
    storePerformanceMetrics(event.data.metrics);
  }
});

// Store performance metrics for analysis
async function storePerformanceMetrics(metrics) {
  try {
    const cache = await caches.open(PERFORMANCE_CACHE);
    const key = `metrics-${Date.now()}`;
    const response = new Response(JSON.stringify({
      metrics,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    }));
    
    await cache.put(key, response);
    
    // Keep only last 20 metric entries to prevent cache bloat
    const keys = await cache.keys();
    if (keys.length > 20) {
      const oldKeys = keys
        .sort((a, b) => parseInt(a.url.split('-')[1]) - parseInt(b.url.split('-')[1]))
        .slice(0, keys.length - 20);
      await Promise.all(oldKeys.map(key => cache.delete(key)));
    }
  } catch (error) {
    console.error('[SW] Error storing performance metrics:', error);
  }
}

// Resource timing monitoring
self.addEventListener('fetch', (event) => {
  const startTime = performance.now();
  
  // Add performance monitoring to existing fetch handler
  const originalResponse = event.respondWith;
  event.respondWith = function(responsePromise) {
    return responsePromise.then(response => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log slow requests for analysis
      if (duration > 1000) { // Requests slower than 1 second
        console.warn('[SW] Slow request detected:', {
          url: event.request.url,
          duration: `${duration.toFixed(2)}ms`,
          cached: response.headers.get('X-Cached') === 'true'
        });
      }
      
      return response;
    });
  };
  
  // Call original fetch event handler
  originalFetchHandler(event);
});

// Original fetch handler separated for better organization
function originalFetchHandler(event) {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/offline');
        })
    );
    return;
  }

  // Default strategy: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
}

// Cleanup task for performance cache
setInterval(async () => {
  try {
    const cache = await caches.open(PERFORMANCE_CACHE);
    const keys = await cache.keys();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const request of keys) {
      const timestamp = parseInt(request.url.split('-')[1]);
      if (now - timestamp > maxAge) {
        await cache.delete(request);
      }
    }
  } catch (error) {
    console.error('[SW] Performance cache cleanup error:', error);
  }
}, 60 * 60 * 1000); // Run every hour

console.log('[SW] Service worker v1.2.0 loaded successfully with performance monitoring');