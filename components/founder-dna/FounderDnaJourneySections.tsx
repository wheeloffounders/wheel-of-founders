'use client'

import { useCallback, useEffect, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import {
  JourneyWorkspaceTabs,
  type JourneyWorkspaceTab,
} from '@/components/founder-dna/JourneyWorkspaceTabs'
import { JourneyBadgeSection } from '@/components/badges/JourneyBadgeSection'
import { FounderDnaScheduleTimeline } from '@/components/founder-dna/FounderDnaScheduleTimeline'
import { FounderDnaLifetimeStats } from '@/components/founder-dna/FounderDnaLifetimeStats'
import { JourneyRoadmapSidebar } from '@/components/founder-dna/JourneyRoadmapSidebar'
import { JourneyHistoryBentoGrid } from '@/components/founder-dna/JourneyHistoryBentoGrid'
import { JourneyBlueprintCard } from '@/components/founder-dna/JourneyBlueprintCard'
import {
  journeyPageGridClassName,
  journeyPageLeftColumnClassName,
  journeyPageRightColumnClassName,
} from '@/components/founder-dna/journey-page-layouts'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'
import { useJourneyWeeks } from '@/lib/hooks/useJourneyWeeks'
import { supabase } from '@/lib/supabase'

/** Journey hub — bento roadmap + sticky tracker (single journey fetch for badges/schedule). */
export function FounderDnaJourneySections() {
  const journey = useFounderJourney()
  const { weeks, loading: weeksLoading, error: weeksError } = useJourneyWeeks()
  const [activeTab, setActiveTab] = useState<JourneyWorkspaceTab>('roadmap')
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null)
  const [resilienceDays, setResilienceDays] = useState<number | null>(null)

  const refreshResilience = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data: lastResolved } = await supabase
      .from('emergencies')
      .select('updated_at')
      .eq('user_id', user.id)
      .eq('resolved', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lastResolved?.updated_at) {
      const d = differenceInCalendarDays(new Date(), new Date(lastResolved.updated_at as string))
      setResilienceDays(Math.max(0, d))
    } else {
      setResilienceDays(null)
    }
  }, [])

  useEffect(() => {
    void refreshResilience()
    const onSync = () => void refreshResilience()
    window.addEventListener('data-sync-request', onSync)
    return () => window.removeEventListener('data-sync-request', onSync)
  }, [refreshResilience])

  useEffect(() => {
    if (weeks.length > 0 && !selectedWeekStart) {
      setSelectedWeekStart(weeks[0]!.weekStart)
    }
  }, [weeks, selectedWeekStart])

  return (
    <>
      <JourneyWorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'roadmap' ? (
        <>
          <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-8">
            Your founder roadmap — week by week. Scan the grid, expand any chapter, and track how far you&apos;ve
            climbed.
          </p>

          <div className={journeyPageGridClassName}>
            <div className={journeyPageLeftColumnClassName}>
              <JourneyRoadmapSidebar
                journey={journey}
                weeks={weeks}
                weeksLoading={weeksLoading}
                selectedWeekStart={selectedWeekStart}
                onSelectWeek={setSelectedWeekStart}
                resilienceDays={resilienceDays}
              />
            </div>

            <div className={journeyPageRightColumnClassName}>
              <JourneyHistoryBentoGrid weeks={weeks} loading={weeksLoading} error={weeksError} />
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <JourneyBlueprintCard as="section" aria-labelledby="journey-schedule">
            <h2 id="journey-schedule" className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Unlock schedule
            </h2>
            <FounderDnaScheduleTimeline journey={journey} />
          </JourneyBlueprintCard>

          <div className="space-y-6">
            <JourneyBlueprintCard as="section" aria-labelledby="journey-badges">
              <h2 id="journey-badges" className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Badge gallery
              </h2>
              <JourneyBadgeSection journey={journey} />
            </JourneyBlueprintCard>

            <JourneyBlueprintCard as="section" aria-labelledby="journey-stats">
              <h2 id="journey-stats" className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Lifetime stats
              </h2>
              <FounderDnaLifetimeStats journey={journey} />
            </JourneyBlueprintCard>
          </div>
        </div>
      )}
    </>
  )
}
