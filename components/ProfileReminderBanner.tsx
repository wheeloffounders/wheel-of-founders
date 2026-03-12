'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/design-tokens'
import { getUserSession } from '@/lib/auth'

const DISMISS_KEY = 'wof_profile_reminder_dismissed'

export function ProfileReminderBanner() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      if (typeof window === 'undefined') return
      if (localStorage.getItem(DISMISS_KEY)) {
        setLoading(false)
        return
      }

      const session = await getUserSession()
      if (!session) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('user_profiles')
        .select('profile_completed_at')
        .eq('id', session.user.id)
        .maybeSingle()

      const completed = (data as { profile_completed_at?: string } | null)?.profile_completed_at
      setShow(!completed)
      setLoading(false)
    }
    check()
  }, [])

  const handleDismiss = () => {
    setShow(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, 'true')
    }
  }

  if (loading || !show) return null

  return (
    <div className="mb-4 p-4 rounded-lg border-l-4 relative bg-[#f8f4f0] dark:bg-amber-900/20" style={{ borderColor: colors.coral.DEFAULT }}>
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <p className="text-sm text-gray-700 dark:text-gray-300 pr-8">
        🦌 <strong>Mrs. Deer wants to know you better.</strong>{' '}
        <Link href="/profile" className="hover:underline font-medium" style={{ color: colors.coral.DEFAULT }}>
          Complete your profile
        </Link>{' '}
        for more personalized insights.
      </p>
    </div>
  )
}
