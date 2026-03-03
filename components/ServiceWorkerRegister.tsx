'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // Register in production and on localhost (for push testing)
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    if (!isLocalhost && process.env.NODE_ENV !== 'production') return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error)
        })
    }
  }, [])

  return null
}

