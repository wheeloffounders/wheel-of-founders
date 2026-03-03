'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Users, Sparkles } from 'lucide-react'
import Link from 'next/link'

export function DuoUpgradeBanner() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    checkUserStatus()
  }, [])

  const checkUserStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check plan type and duo status
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan_type, duo_relationship_id, last_duo_reminder, duo_reminder_count')
      .eq('id', user.id)
      .maybeSingle()

    const hasDuo = profile?.plan_type === 'duo_primary' || profile?.plan_type === 'duo_secondary'

    if (hasDuo) {
      setShow(false)
      return
    }

    // Check if user has active duo relationship
    const { data: duo } = await supabase
      .from('duo_relationships')
      .select('id')
      .or(`primary_user_id.eq.${user.id},secondary_user_id.eq.${user.id}`)
      .eq('status', 'active')
      .maybeSingle()

    if (duo) {
      setShow(false)
      return
    }

    const lastReminder = profile?.last_duo_reminder ? new Date(profile.last_duo_reminder) : null
    const reminderCount = (profile?.duo_reminder_count as number) ?? 0

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const canShowByTime = !lastReminder || lastReminder < sevenDaysAgo
    const canShowByCount = reminderCount < 3

    setShow(canShowByTime && canShowByCount && !dismissed)
  }

  const handleDismiss = async () => {
    setDismissed(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('duo_reminder_count')
      .eq('id', user.id)
      .maybeSingle()

    const currentCount = (profile?.duo_reminder_count as number) ?? 0

    await (supabase.from('user_profiles') as any).upsert(
      {
        id: user.id,
        last_duo_reminder: new Date().toISOString(),
        duo_reminder_count: currentCount + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
  }

  if (!show) return null

  return (
    <div className="bg-gradient-to-r from-[#152b50] to-[#1a3565] text-white">
      <div className="max-w-7xl mx-auto px-4 py-3 relative">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#ef725c]" />
            <p className="text-sm">
              <span className="font-semibold">Save up to 35% with Duo!</span> Get two Pro accounts for just <span className="font-bold">$25/month each</span> when paid annually.
            </p>
          </div>
          <Link
            href="/checkout?plan=duo"
            className="flex items-center gap-2 bg-[#ef725c] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#e8654d] transition-colors ml-4 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Start Duo
          </Link>
        </div>
      </div>
    </div>
  )
}
