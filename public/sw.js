// Version: 2026.03.10 - Push logging and error handling
// Bump this when you change the SW so browsers pick up the new file

const CACHE_NAME = 'wof-v5'

self.addEventListener('install', function (event) {
  console.log('[sw] install', CACHE_NAME)
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  console.log('[sw] activate, claiming clients')
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            if (key !== CACHE_NAME) {
              console.log('[sw] delete old cache', key)
              return caches.delete(key)
            }
          })
        )
      })
    ]).then(function () {
      console.log('[sw] activate complete')
    })
  )
})

// Push notification handler
self.addEventListener('push', function (event) {
  console.log('[sw] push event received')

  if (!event.data) {
    console.warn('[sw] Push event had no data - cannot show notification')
    return
  }

  let data
  try {
    data = event.data.json()
    console.log('[sw] Push data parsed:', typeof data.title, typeof data.body, data.url ? 'url present' : 'no url')
  } catch (e) {
    console.error('[sw] Push data.json() failed', e)
    return
  }

  const title = data.title && String(data.title).trim() ? data.title : 'Wheel of Founders'
  const body = data.body != null ? String(data.body) : ''
  console.log('[sw] Showing notification:', title, body ? body.slice(0, 40) + (body.length > 40 ? '...' : '') : '(no body)')

  const options = {
    body: body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    vibrate: Array.isArray(data.vibrate) ? data.vibrate : [200, 100, 200],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: [{ action: 'open', title: 'Open App' }]
  }

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(function () {
        console.log('[sw] showNotification succeeded')
      })
      .catch(function (err) {
        console.error('[sw] showNotification failed', err?.name, err?.message, err)
      })
  )
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
