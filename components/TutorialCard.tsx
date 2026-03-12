'use client'

import { useState, useEffect } from 'react'
import { useComprehensiveTour } from '@/lib/contexts/ComprehensiveTourContext'
import { supabase } from '@/lib/supabase'
import { HelpCircle } from 'lucide-react'
import { isNewOnboardingEnabled } from '@/lib/feature-flags'

const DISMISS_KEY = 'wof_tutorial_card_dismissed'

export function TutorialCard() {
  const ctx = useComprehensiveTour()
  const startTour = ctx?.startTour ?? (() => {})
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      if (typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_KEY) === 'true') {
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await (supabase.from('user_profiles') as any)
        .select('created_at')
        .eq('id', user.id)
        .maybeSingle()

      const createdAt = profile?.created_at ? new Date(profile.created_at) : null
      const daysSinceJoin = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0

      setShow(daysSinceJoin < 3)
      setLoading(false)
    }
    check()
  }, [])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, 'true')
    }
    setShow(false)
  }

  if (!isNewOnboardingEnabled() || loading || !show) return null

  return (
    <div
      className="mb-6 p-4 rounded-xl border border-[#152b50]/20 dark:border-[#152b50]/40 bg-[#152b50]/5 dark:bg-[#152b50]/20"
      data-tutorial="tutorial-card"
    >
      <div className="flex items-start gap-3">
        <HelpCircle className="w-6 h-6 text-[#ef725c] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            Want to understand what every part of the app does?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Take a 3-minute guided tour of:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
            <li>• Dashboard — your command center</li>
            <li>• Morning — where each day begins</li>
            <li>• Evening — where patterns emerge</li>
            <li>• History — see your journey</li>
            <li>• Weekly/Monthly/Quarterly — watch your growth</li>
            <li>• Emergency — for when things go sideways</li>
            <li>• Profile — where Mrs. Deer learns you</li>
          </ul>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={startTour}
              className="px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition"
              style={{ backgroundColor: '#ef725c' }}
            >
              Show me around
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-2 rounded-lg font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
