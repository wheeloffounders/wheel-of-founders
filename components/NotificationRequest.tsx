'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function NotificationRequest() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const subscribeToPush = async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      setError('Push notifications not configured')
      return
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Your browser does not support push notifications')
      return
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })

    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify(subscription.toJSON()),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error || 'Failed to save subscription')
    }
  }

  const requestPermission = async () => {
    setError(null)
    if (!('Notification' in window)) {
      setError('Your browser does not support notifications')
      return
    }

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === 'granted') {
      setIsSubscribing(true)
      try {
        await subscribeToPush()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to enable')
      } finally {
        setIsSubscribing(false)
      }
    }
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
        <Bell className="w-4 h-4 mr-1" />
        Push notifications enabled
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={requestPermission}
        disabled={isSubscribing}
        className="flex items-center px-4 py-2 bg-[#ef725c] text-white text-sm font-medium rounded-lg hover:bg-[#e8654d] disabled:opacity-50 transition"
      >
        <Bell className="w-4 h-4 mr-2" />
        {isSubscribing ? 'Enabling...' : 'Enable Push Notifications'}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
