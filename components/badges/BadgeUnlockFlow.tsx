'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JourneyBadge } from '@/lib/types/founder-dna'
import { getBadgeCelebrationTier } from '@/lib/badges/badge-definitions'
import { getBadgeToastLine } from '@/lib/badges/badge-messages'
import { BadgeCelebrationModal } from '@/components/badges/BadgeCelebrationModal'
import { supabase } from '@/lib/supabase'

/** Dedupe once-ever per browser/profile (across tabs and sessions). */
const STORAGE_MODAL = 'badge_celebration_modal_dismissed_v1'
const STORAGE_TOAST = 'badge_minor_toast_shown_v1'

function loadNameSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

function saveNameSet(key: string, set: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(Array.from(set)))
}

function tierWeight(tier: string): number {
  if (tier === 'epic') return 3
  if (tier === 'major') return 2
  return 1
}

function tierOf(b: JourneyBadge): ReturnType<typeof getBadgeCelebrationTier> {
  return b.celebrationTier ?? getBadgeCelebrationTier(b.name)
}

type BadgeUnlockFlowProps = {
  /** From GET /api/founder-dna/journey — badges unlocked this response */
  newlyUnlockedBadges?: JourneyBadge[]
}

/**
 * Minor → toast only. Major / epic → celebration modal (epic adds confetti + Mrs. Deer when copy exists).
 * Chains multiple modals / toasts from one batch in priority order.
 */
export function BadgeUnlockFlow({ newlyUnlockedBadges }: BadgeUnlockFlowProps) {
  const batchKey = useMemo(
    () =>
      (newlyUnlockedBadges ?? [])
        .map((b) => `${b.name}:${b.unlocked_at}`)
        .sort()
        .join('|'),
    [newlyUnlockedBadges],
  )

  const modalsRemaining = useRef<JourneyBadge[]>([])
  const minorsRemaining = useRef<JourneyBadge[]>([])
  const [modalBadge, setModalBadge] = useState<JourneyBadge | null>(null)
  const [toastBadge, setToastBadge] = useState<JourneyBadge | null>(null)
  const [founderGoalText, setFounderGoalText] = useState<string | null>(null)
  const startedForKey = useRef<string | null>(null)

  const startBatch = useCallback((batch: JourneyBadge[]) => {
    if (typeof window === 'undefined' || batch.length === 0) return

    const modalSeen = loadNameSet(STORAGE_MODAL)
    const toastSeen = loadNameSet(STORAGE_TOAST)

    const majorEpic = batch
      .filter((b) => {
        const t = tierOf(b)
        return (t === 'major' || t === 'epic') && !modalSeen.has(b.name)
      })
      .sort((a, b) => tierWeight(tierOf(b)) - tierWeight(tierOf(a)))

    const minors = batch.filter((b) => tierOf(b) === 'minor' && !toastSeen.has(b.name))

    modalsRemaining.current = majorEpic.slice(1)
    minorsRemaining.current = minors

    if (majorEpic.length > 0) {
      setModalBadge(majorEpic[0])
      return
    }

    if (minors.length > 0) {
      setToastBadge(minors[0])
      minorsRemaining.current = minors.slice(1)
    }
  }, [])

  useEffect(() => {
    if (!batchKey || startedForKey.current === batchKey) return
    const batch = newlyUnlockedBadges ?? []
    if (batch.length === 0) return
    startedForKey.current = batchKey
    startBatch(batch)
  }, [batchKey, newlyUnlockedBadges, startBatch])

  const closeModalAndContinue = useCallback(() => {
    if (!modalBadge) return
    const seen = loadNameSet(STORAGE_MODAL)
    seen.add(modalBadge.name)
    saveNameSet(STORAGE_MODAL, seen)
    setModalBadge(null)

    if (modalsRemaining.current.length > 0) {
      const next = modalsRemaining.current[0]
      modalsRemaining.current = modalsRemaining.current.slice(1)
      setModalBadge(next)
      return
    }

    if (minorsRemaining.current.length > 0) {
      const next = minorsRemaining.current[0]
      minorsRemaining.current = minorsRemaining.current.slice(1)
      setToastBadge(next)
    }
  }, [modalBadge])

  useEffect(() => {
    if (!toastBadge || typeof window === 'undefined') return
    const seen = loadNameSet(STORAGE_TOAST)
    seen.add(toastBadge.name)
    saveNameSet(STORAGE_TOAST, seen)

    const t = window.setTimeout(() => {
      setToastBadge(null)
      if (minorsRemaining.current.length > 0) {
        const next = minorsRemaining.current[0]
        minorsRemaining.current = minorsRemaining.current.slice(1)
        setToastBadge(next)
      }
    }, 3500)
    return () => window.clearTimeout(t)
  }, [toastBadge])

  const epic = modalBadge ? tierOf(modalBadge) === 'epic' : false
  const founderStoryCelebration = modalBadge?.name === 'founder_story'
  const rhythmKeeperCelebration = modalBadge?.name === 'rhythm_keeper'

  useEffect(() => {
    let cancelled = false
    const loadGoal = async () => {
      if (!founderStoryCelebration) {
        setFounderGoalText(null)
        return
      }
      try {
        const { data: auth } = await supabase.auth.getUser()
        const user = auth.user
        if (!user?.id) return
        const { data } = await supabase
          .from('user_profiles')
          .select('primary_goal_text')
          .eq('id', user.id)
          .maybeSingle()
        if (cancelled) return
        setFounderGoalText(typeof data?.primary_goal_text === 'string' ? data.primary_goal_text : null)
      } catch {
        if (!cancelled) setFounderGoalText(null)
      }
    }
    void loadGoal()
    return () => {
      cancelled = true
    }
  }, [founderStoryCelebration])

  return (
    <>
      <BadgeCelebrationModal
        open={Boolean(modalBadge)}
        badge={modalBadge}
        withConfetti={epic || founderStoryCelebration || rhythmKeeperCelebration}
        founderGoalText={founderGoalText}
        onContinue={closeModalAndContinue}
      />

      {toastBadge ? (
        <div className="fixed bottom-4 right-4 z-[90] rounded-lg border border-[#ef725c]/40 bg-white dark:bg-gray-900 shadow-lg px-4 py-3 max-w-xs">
          <div className="text-xs text-[#ef725c] font-medium">Mrs. Deer noticed</div>
          <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            {toastBadge.icon} {toastBadge.label}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
            {getBadgeToastLine(toastBadge.name, toastBadge.description)}
          </div>
        </div>
      ) : null}
    </>
  )
}
