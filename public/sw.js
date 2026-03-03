// Version: 2026.02.26 - Network-first for HTML, only cache GET requests

const CACHE_NAME = 'wof-v4'

self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(keys => 
        Promise.all(keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key)
        }))
      )
    ])
  )
})

// Push notification handler
self.addEventListener('push', function (event) {
  if (!event.data) return
  let data
  try {
    data = event.data.json()
  } catch {
    return
  }
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: [{ action: 'open', title: 'Open App' }]
  }
  event.waitUntil(self.registration.showNotification(data.title || 'Wheel of Founders', options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

self.addEventListener('fetch', event => {
  // For HTML pages (navigation requests) - ALWAYS go to network
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Never cache HTML
          return response
        })
        .catch(() => {
          // If offline, try to serve a minimal offline page
          return caches.match('/offline.html')
        })
    )
    return
  }

  // For assets (JS, CSS, images) - network-first, cache fallback
  // Skip caching for non-GET - Cache API does not support POST/PUT/etc
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request))
    return
  }
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
