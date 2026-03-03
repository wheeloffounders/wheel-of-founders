'use client'

import { formatDistanceToNow } from 'date-fns'
import { RefreshCw } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

export function LastUpdated({
  timestamp,
  isSyncing,
  onRefresh,
}: {
  timestamp: Date | null
  isSyncing: boolean
  onRefresh?: () => void
}) {
  if (!timestamp) return null

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-xs border-b transition-all duration-200"
      style={{
        backgroundColor: colors.neutral.background,
        borderColor: colors.neutral.border,
        color: colors.neutral.text.secondary,
      }}
    >
      <span>Updated {formatDistanceToNow(timestamp, { addSuffix: true })}</span>
      {onRefresh && (
      <button
        onClick={onRefresh}
        disabled={isSyncing}
        className="p-1 rounded-full transition-all duration-200 hover:bg-opacity-50"
        style={{
          backgroundColor: isSyncing ? 'transparent' : 'transparent',
          opacity: isSyncing ? 0.6 : 1,
        }}
        aria-label="Refresh data"
      >
        <RefreshCw
          className="w-4 h-4 transition-transform duration-200"
          style={{
            color: colors.navy.DEFAULT,
            transform: isSyncing ? 'rotate(360deg)' : 'rotate(0deg)',
            animation: isSyncing ? 'spin 1s linear infinite' : 'none',
          }}
        />
      </button>
      )}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
