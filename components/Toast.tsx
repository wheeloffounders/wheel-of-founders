'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

export interface ToastDetail {
  message: string
  type?: 'success' | 'error' | 'info'
  onRetry?: () => void
}

interface ToastMessage {
  message: string
  type: 'success' | 'error' | 'info'
  id: string
  onRetry?: () => void
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

    const handleToast = (event: CustomEvent<ToastDetail>) => {
      const { message, type = 'success', onRetry } = event.detail
      const now = Date.now()
      const messageKey = onRetry ? `${type}:${message}:${now}` : `${type}:${message}`

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

      const dismissMs = type === 'error' && onRetry ? 8000 : 3000
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
      }, dismissMs)
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
            backgroundColor: toast.type === 'error' ? '#FEF2F2' : toast.type === 'success' ? '#ECFDF3' : toast.type === 'info' ? '#EFF6FF' : colors.neutral.card,
            borderColor: toast.type === 'error' ? '#FECACA' : toast.type === 'success' ? colors.emerald.DEFAULT : toast.type === 'info' ? '#BFDBFE' : colors.neutral.border,
            borderWidth: '1px',
            color: toast.type === 'error' ? '#B91C1C' : toast.type === 'success' ? colors.emerald.DEFAULT : toast.type === 'info' ? '#1E40AF' : colors.neutral.text.primary,
          }}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          {toast.type === 'error' && toast.onRetry && (
            <button
              onClick={() => {
                toast.onRetry?.()
                removeToast(toast.id)
              }}
              className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
            >
              Retry
            </button>
          )}
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
