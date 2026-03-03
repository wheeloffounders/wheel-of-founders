'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

interface ToastMessage {
  message: string
  type: 'success' | 'error' | 'info'
  id: string
}

// Prevent duplicate toasts within a time window
const toastHistory = new Map<string, number>()
const DEDUP_MS = 3000
const MAX_RECENT_MS = 5000
const MAX_RECENT_COUNT = 3

export function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const cleanupHistory = () => {
      const now = Date.now()
      toastHistory.forEach((timestamp, key) => {
        if (now - timestamp > 10000) toastHistory.delete(key)
      })
    }
    const cleanupInterval = setInterval(cleanupHistory, 10000)

    const handleToast = (event: CustomEvent<{ message: string; type: 'success' | 'error' | 'info' }>) => {
      const { message, type = 'success' } = event.detail
      const now = Date.now()
      const messageKey = `${type}:${message}`

      // Suppress duplicate messages within DEDUP_MS
      const lastShown = toastHistory.get(messageKey)
      if (lastShown && now - lastShown < DEDUP_MS) return

      // Suppress if too many toasts in recent window
      const recentTimestamps = Array.from(toastHistory.values()).filter((t) => now - t < MAX_RECENT_MS)
      if (recentTimestamps.length >= MAX_RECENT_COUNT) return

      toastHistory.set(messageKey, now)

      const newToast: ToastMessage = {
        message,
        type,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }
      setToasts((prev) => [...prev, newToast])

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
      }, 3000)
    }

    window.addEventListener('toast', handleToast as EventListener)
    return () => {
      window.removeEventListener('toast', handleToast as EventListener)
      clearInterval(cleanupInterval)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="toast fixed top-4 right-4 z-[var(--z-index-toast)] space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md transition-all duration-200 animate-slide-in"
          style={{
            backgroundColor: toast.type === 'error' ? '#FEF2F2' : toast.type === 'success' ? '#ECFDF3' : colors.neutral.card,
            borderColor: toast.type === 'error' ? '#FECACA' : toast.type === 'success' ? colors.emerald.DEFAULT : colors.neutral.border,
            borderWidth: '1px',
            color: toast.type === 'error' ? '#B91C1C' : toast.type === 'success' ? colors.emerald.DEFAULT : colors.neutral.text.primary,
          }}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:opacity-70 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
