'use client'

import { CelebrationGapCard } from '@/components/founder-dna/CelebrationGapCard'
import { PatternBuilding } from '@/components/dashboard/PatternBuilding'
import { YourStorySoFar } from '@/components/dashboard/YourStorySoFar'
import { RhythmBlueprintCard } from '@/components/founder-dna/RhythmBlueprintCard'
import { WeeklyArchetypeDriftCard } from '@/components/weekly/WeeklyArchetypeDriftCard'
import { useWeeklyDriftMetrics } from '@/lib/hooks/useWeeklyDriftMetrics'
import {
  rhythmPageGridClassName,
  rhythmPageLeftColumnClassName,
  rhythmPageRightColumnClassName,
} from '@/components/founder-dna/rhythm-page-layouts'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'
import type { JourneyBadge } from '@/lib/types/founder-dna'
import {
  CELEBRATION_GAP_MIN_DAYS,
  SCHEDULE_STORY_SO_FAR_DAY,
  SCHEDULE_UNSEEN_WINS_DAY,
} from '@/lib/founder-dna/unlock-schedule-config'

function hasFeature(unlocked: JourneyBadge[] | undefined, name: string): boolean {
  return unlocked?.some((f) => f.name === name) ?? false
}

const RHYTHM_FIRST_UNLOCK_PEEK =
  "Mrs. Deer will start weaving your first narrative from what you've shared."

type RhythmTeaser = {
  id: string
  emoji: string
  title: string
  targetDays: number
  remaining: number
  peek: string
}

function buildRhythmTeasers(
  dwe: number,
  storyUnlocked: boolean,
  gapUnlocked: boolean,
  unseenUnlocked: boolean,
): RhythmTeaser[] {
  const out: RhythmTeaser[] = []
  if (!storyUnlocked) {
    const remaining = Math.max(0, SCHEDULE_STORY_SO_FAR_DAY - dwe)
    out.push({
      id: 'story',
      emoji: '📚',
      title: 'Your Story So Far',
      targetDays: SCHEDULE_STORY_SO_FAR_DAY,
      remaining,
      peek:
        "Mrs. Deer will start weaving your first narrative from what you've shared — your wins, your lessons, and the threads that connect them.",
    })
  }
  if (!gapUnlocked) {
    const remaining = Math.max(0, CELEBRATION_GAP_MIN_DAYS - dwe)
    out.push({
      id: 'gap',
      emoji: '🪞',
      title: 'Celebration Gap',
      targetDays: CELEBRATION_GAP_MIN_DAYS,
      remaining,
      peek:
        'Mrs. Deer will mirror the wins hiding inside your lessons — the progress you narrate as struggle, reframed with warmth.',
    })
  }
  if (!unseenUnlocked) {
    const remaining = Math.max(0, SCHEDULE_UNSEEN_WINS_DAY - dwe)
    out.push({
      id: 'unseen',
      emoji: '✨',
      title: 'Unseen Wins',
      targetDays: SCHEDULE_UNSEEN_WINS_DAY,
      remaining,
      peek:
        "Mrs. Deer will surface wins you might not be naming yet — small moves that deserve credit on the path you're on.",
    })
  }
  return out.sort((a, b) => a.targetDays - b.targetDays)
}

function RhythmTeasersBlock({ teasers, variant }: { teasers: RhythmTeaser[]; variant: 'lead' | 'tail' }) {
  if (teasers.length === 0) return null
  const isTail = variant === 'tail'
  return (
    <RhythmBlueprintCard
      as="section"
      headerTag={{ label: isTail ? 'Opening next' : 'On the way', tone: 'amber' }}
      title={isTail ? 'Still opening' : 'On the way'}
      titleId="rhythm-teasers"
      innerClassName={isTail ? 'pt-6' : undefined}
    >
      <div className="space-y-5">
        {teasers.map((item) => (
          <div key={item.id}>
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
              <span aria-hidden className="mr-1">
                {item.emoji}
              </span>
              {item.title}
              <span className="font-normal text-gray-600 dark:text-gray-400">
                {' '}
                — In {item.remaining} {item.remaining === 1 ? 'day' : 'days'}
              </span>
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-0 sm:pl-6">
              {item.peek}
            </p>
          </div>
        ))}
      </div>
    </RhythmBlueprintCard>
  )
}

export function RhythmPageContent() {
  const { data, loading, error } = useFounderJourney()
  const weeklyDrift = useWeeklyDriftMetrics()

  if (loading && !data) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 italic">Gathering your rhythm…</p>
  }

  if (error && !data) {
    return (
      <p className="text-sm text-gray-600 dark:text-red-400" role="alert">
        Could not load your journey. Refresh the page or try again shortly.
      </p>
    )
  }

  const milestones = data?.milestones
  const dwe = milestones?.daysWithEntries ?? milestones?.daysActive ?? 0
  const feats = data?.unlockedFeatures ?? []

  const storyUnlocked = dwe >= SCHEDULE_STORY_SO_FAR_DAY || hasFeature(feats, 'your_story_so_far')
  const gapUnlocked = dwe >= CELEBRATION_GAP_MIN_DAYS || hasFeature(feats, 'celebration_gap')
  const unseenUnlocked = dwe >= SCHEDULE_UNSEEN_WINS_DAY || hasFeature(feats, 'unseen_wins')

  const teasers = buildRhythmTeasers(dwe, storyUnlocked, gapUnlocked, unseenUnlocked)
  const hasMainSections = storyUnlocked || gapUnlocked || unseenUnlocked
  const showFirstUnlockProgress = dwe < SCHEDULE_STORY_SO_FAR_DAY
  const rhythmFirstRemaining = SCHEDULE_STORY_SO_FAR_DAY - dwe

  return (
    <>
      <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-8">
        Your rhythm updates every Tuesday — new insights, fresh patterns, and the wins you might have missed.
      </p>

      <div className="w-full mb-8">
        <WeeklyArchetypeDriftCard {...weeklyDrift.metrics} />
      </div>

      <div className={rhythmPageGridClassName}>
        <div className={rhythmPageLeftColumnClassName}>
          {!hasMainSections && teasers.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Keep checking in — as you show up, new pieces of your rhythm appear here after your first few active
              days.
            </p>
          ) : null}

          {!hasMainSections ? <RhythmTeasersBlock teasers={teasers} variant="lead" /> : null}

          {storyUnlocked ? (
            <RhythmBlueprintCard
              as="section"
              headerTag={{ label: 'Narrative', tone: 'indigo' }}
              title="Your Story So Far"
              titleId="rhythm-story"
              titleEmoji="📚"
            >
              <YourStorySoFar showCardTitle={false} embedded />
            </RhythmBlueprintCard>
          ) : null}

          {hasMainSections ? <RhythmTeasersBlock teasers={teasers} variant="tail" /> : null}
        </div>

        <aside className={rhythmPageRightColumnClassName} aria-label="Weekly rhythm calibration">
          {gapUnlocked ? (
            <RhythmBlueprintCard
              as="section"
              headerTag={{ label: 'Reflection', tone: 'violet' }}
              title="Celebration Gap"
              titleId="rhythm-celebration-gap"
              titleEmoji="🪞"
            >
              <CelebrationGapCard />
            </RhythmBlueprintCard>
          ) : null}

          {unseenUnlocked ? (
            <RhythmBlueprintCard
              as="section"
              headerTag={{ label: 'Pattern', tone: 'sky' }}
              title="Unseen Wins"
              titleId="rhythm-unseen"
              titleEmoji="✨"
            >
              <PatternBuilding showCardHeading={false} rhythmGatedUnlock embedded />
            </RhythmBlueprintCard>
          ) : null}

          {showFirstUnlockProgress ? (
            <RhythmBlueprintCard headerTag={{ label: 'Preview', tone: 'amber' }} title="First narrative">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{RHYTHM_FIRST_UNLOCK_PEEK}</p>
            </RhythmBlueprintCard>
          ) : null}
        </aside>
      </div>
    </>
  )
}
