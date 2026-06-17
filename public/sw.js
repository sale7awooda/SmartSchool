const CACHE = 'smart-school-v1';
const ASSETS = ['/', '/dashboard'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/dashboard'))
    );
    return;
  }
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      fetch(request)
        .then((res) => { cache.put(request, res.clone()); return res; })
        .catch(() => caches.match(request))
    )
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Smart School', {
      body: data.body || '',
      icon: '/icon-192x192.png',
      data: { url: data.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const found = clients.find((c) => c.url === url);
      if (found) return found.focus();
      return self.clients.openWindow(url);
    })
  );
});
