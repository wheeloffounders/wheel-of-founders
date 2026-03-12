'use client'

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export interface InAppNotificationItem {
  id: string
  title: string
  body?: string
  url?: string
  readAt: Date | null
  createdAt: Date
}

interface InAppNotificationContextValue {
  notifications: InAppNotificationItem[]
  unreadCount: number
  addNotification: (payload: { title: string; body?: string; url?: string }) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clear: () => void
}

const InAppNotificationContext = createContext<InAppNotificationContextValue | null>(null)

const MAX_STORED = 50

export function InAppNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([])

  const addNotification = useCallback(
    (payload: { title: string; body?: string; url?: string }) => {
      const item: InAppNotificationItem = {
        id: `inapp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        readAt: null,
        createdAt: new Date(),
      }
      setNotifications((prev) => [item, ...prev].slice(0, MAX_STORED))
    },
    []
  )

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date() } : n))
    )
  }, [])

  const markAllRead = useCallback(() => {
    const now = new Date()
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })))
  }, [])

  const clear = useCallback(() => setNotifications([]), [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications]
  )

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markRead,
      markAllRead,
      clear,
    }),
    [notifications, unreadCount, addNotification, markRead, markAllRead, clear]
  )

  return (
    <InAppNotificationContext.Provider value={value}>
      {children}
    </InAppNotificationContext.Provider>
  )
}

export function useInAppNotifications(): InAppNotificationContextValue {
  const ctx = useContext(InAppNotificationContext)
  if (!ctx) {
    return {
      notifications: [],
      unreadCount: 0,
      addNotification: () => {},
      markRead: () => {},
      markAllRead: () => {},
      clear: () => {},
    }
  }
  return ctx
}
