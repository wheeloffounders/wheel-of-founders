'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

interface ToastMessage {
  message: string
  type: 'success' | 'error' | 'info'
  id: string
}

export function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const handleToast = (event: CustomEvent<{ message: string; type: 'success' | 'error' | 'info' }>) => {
      const newToast: ToastMessage = {
        ...event.detail,
        id: Date.now().toString(),
      }
      setToasts((prev) => [...prev, newToast])

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
      }, 3000)
    }

    window.addEventListener('toast', handleToast as EventListener)
    return () => {
      window.removeEventListener('toast', handleToast as EventListener)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md transition-all duration-200 animate-in slide-in-from-right"
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
