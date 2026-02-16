'use client'

import { Lock, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format, subDays } from 'date-fns'
import { getFeatureAccess, UserProfile } from '@/lib/features'

interface HistoryAccessGateProps {
  user: UserProfile | null
  children: React.ReactNode
  date: Date
}

export function HistoryAccessGate({ user, children, date }: HistoryAccessGateProps) {
  const router = useRouter()
  const features = getFeatureAccess(user)
  const today = new Date()
  const cutoffDate = subDays(today, features.viewableHistoryDays)
  const isLocked = date < cutoffDate

  if (!features.canViewFullHistory && isLocked) {
    return (
      <div className="relative">
        {/* Blurred content */}
        <div className="blur-sm pointer-events-none opacity-50">
          {children}
        </div>

        {/* Upgrade overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
          <div className="text-center p-8 max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#ef725c] to-[#152b50] mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              🔒 Unlock Your Full History
            </h3>
            <p className="text-gray-600 mb-4">
              Free tier shows last 2 days only. Entries older than{' '}
              <strong>{format(cutoffDate, 'MMM d, yyyy')}</strong> are locked.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Upgrade to Pro to view unlimited history and unlock AI-powered insights.
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#ef725c] to-[#152b50] text-white rounded-lg font-semibold hover:opacity-90 transition shadow-lg"
            >
              Upgrade to Pro ($19/month)
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Your data is stored forever—upgrade anytime to access it all
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
