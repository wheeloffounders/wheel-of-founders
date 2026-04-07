'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BarChart2, Check, ChevronRight } from 'lucide-react'
import { useInAppNotifications } from '@/lib/contexts/InAppNotificationContext'
import { useNewInsights } from '@/lib/hooks/useNewInsights'
import { cn } from '@/components/ui/utils'

export interface NotificationCenterProps {
  /** Override trigger button styles (e.g. white icon on navy AppHeader). */
  triggerClassName?: string
}

export function NotificationCenter({ triggerClassName }: NotificationCenterProps) {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { notifications, unreadCount, markRead, markAllRead } = useInAppNotifications()
  const { totalNew } = useNewInsights()
  const [open, setOpen] = useState(false)

  const totalBadge = unreadCount + totalNew

  const handleClick = useCallback(
    (url: string | undefined, id: string) => {
      markRead(id)
      setOpen(false)
      if (url) router.push(url)
    },
    [markRead, router]
  )

  const dropdownStyle = ((): React.CSSProperties => {
    if (typeof window === 'undefined') return {}
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return {}
    const gap = 4
    const padding = 16
    const top = rect.bottom + gap
    const left = Math.max(padding, rect.right - Math.min(360, window.innerWidth - padding * 2))
    const width = Math.min(360, window.innerWidth - padding * 2)
    const maxHeight = Math.min(400, window.innerHeight - top - padding)
    return {
      position: 'fixed' as const,
      top: `${top}px`,
      left: `${Math.max(padding, Math.min(left, window.innerWidth - width - padding))}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 110,
    }
  })()

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'relative p-2 rounded-lg',
          triggerClassName ??
            'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        )}
        aria-label={totalBadge > 0 ? `${totalBadge} notifications` : 'Notifications'}
      >
        <Bell className="w-5 h-5" />
        {totalBadge > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-medium bg-[#ef725c] text-white rounded-full">
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/25 dark:bg-black/40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            style={dropdownStyle}
            className="isolate bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden"
            role="dialog"
            aria-label="Notifications and insights"
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-sm text-[#ef725c] hover:underline flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1">
              {totalNew > 0 && (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-100 dark:border-gray-700 text-left cursor-pointer"
                  onClick={() => {
                    setOpen(false)
                    router.push('/insights')
                  }}
                >
                  <BarChart2 className="w-5 h-5 text-[#ef725c] shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {totalNew} new insight{totalNew > 1 ? 's' : ''} ready
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">View in Insights</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              )}
              {notifications.length === 0 && totalNew === 0 ? (
                <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No notifications yet
                </p>
              ) : notifications.length > 0 ? (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleClick(n.url, n.id)}
                        className={`w-full text-left p-3 flex items-start gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${!n.readAt ? 'bg-[#ef725c]/5 dark:bg-[#ef725c]/10' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                              {n.body}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
