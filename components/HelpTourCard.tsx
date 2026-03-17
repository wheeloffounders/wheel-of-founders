'use client'

import { useState, useEffect } from 'react'
import { useComprehensiveTour } from '@/lib/contexts/ComprehensiveTourContext'
import { isTourEnabled } from '@/lib/feature-flags'
import { supabase } from '@/lib/supabase'

const TOUR_ITEMS = [
  'Dashboard — your command center',
  'Morning — where each day begins',
  'Evening — where patterns emerge',
  'History — see your journey',
  'Weekly/Monthly/Quarterly — watch your growth',
  'Emergency — for when things go sideways',
  'Profile — where Mrs. Deer learns you',
]

export function HelpTourCard() {
  const ctx = useComprehensiveTour()
  const startTour = ctx?.startTour ?? (() => {})
  const [show, setShow] = useState<boolean | null>(null)

  useEffect(() => {
    const check = async () => {
      if (!isTourEnabled()) {
        setShow(false)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setShow(false)
        return
      }
      const { data: profile } = await (supabase.from('user_profiles') as any)
        .select('created_at')
        .eq('id', user.id)
        .maybeSingle()
      const createdAt = profile?.created_at ? new Date(profile.created_at) : null
      const daysSinceJoin = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0
      setShow(daysSinceJoin < 3)
    }
    check()
  }, [])

  if (!isTourEnabled() || show !== true) return null

  return (
    <div className="mb-8 p-6 rounded-xl border-2 border-[#152b50]/20 dark:border-[#152b50]/40 bg-[#152b50]/5 dark:bg-[#152b50]/20">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
        Want a 3-minute tour of the app?
      </h3>
      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
        {TOUR_ITEMS.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => startTour()}
        className="px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition"
        style={{ backgroundColor: '#ef725c' }}
      >
        Show me around
      </button>
    </div>
  )
}
