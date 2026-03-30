'use client'

import { CelebrationGapCard } from '@/components/founder-dna/CelebrationGapCard'
import { PatternBuilding } from '@/components/dashboard/PatternBuilding'
import { YourStorySoFar } from '@/components/dashboard/YourStorySoFar'
import { CircleProgress } from '@/components/ui/CircleProgress'
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
    <section
      aria-labelledby="rhythm-teasers"
      className={
        isTail
          ? 'mt-10 pt-2 border-t border-gray-200/80 dark:border-gray-700/80'
          : 'pt-2'
      }
    >
      <h2 id="rhythm-teasers" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        {isTail ? 'Still opening' : 'On the way'}
      </h2>
      <div className="rounded-lg border border-amber-100/80 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/15 px-4 py-4 space-y-5">
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
    </section>
  )
}

export function RhythmPageContent() {
  const { data, loading, error } = useFounderJourney()

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

      {showFirstUnlockProgress ? (
        <div
          className="mb-8 pb-6 border-b border-gray-200/80 dark:border-gray-700/80"
          aria-labelledby="rhythm-first-unlock-heading"
        >
          <div className="flex justify-center">
            <CircleProgress
              current={dwe}
              target={SCHEDULE_STORY_SO_FAR_DAY}
              size={80}
              unitLabel="days"
            />
          </div>
          <div className="mt-4 max-w-lg mx-auto text-left">
            <p
              id="rhythm-first-unlock-heading"
              className="text-sm font-semibold text-gray-900 dark:text-white leading-snug"
            >
              Next unlock: Your Story So Far
              <span className="font-normal text-gray-600 dark:text-gray-400">
                {' '}
                — in {rhythmFirstRemaining} {rhythmFirstRemaining === 1 ? 'day' : 'days'}
              </span>
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {RHYTHM_FIRST_UNLOCK_PEEK}
            </p>
          </div>
        </div>
      ) : null}

      {!hasMainSections && teasers.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Keep checking in — as you show up, new pieces of your rhythm appear here after your first few active days.
        </p>
      ) : null}

      {!hasMainSections ? <RhythmTeasersBlock teasers={teasers} variant="lead" /> : null}

      {storyUnlocked ? (
        <section aria-labelledby="rhythm-story">
          <h2 id="rhythm-story" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            <span aria-hidden>📚 </span>
            Your Story So Far
          </h2>
          <YourStorySoFar showCardTitle={false} />
        </section>
      ) : null}

      {gapUnlocked ? (
        <section aria-labelledby="rhythm-celebration-gap">
          <h2 id="rhythm-celebration-gap" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            <span aria-hidden>🪞 </span>
            Celebration Gap
          </h2>
          <CelebrationGapCard />
        </section>
      ) : null}

      {unseenUnlocked ? (
        <section aria-labelledby="rhythm-unseen">
          <h2 id="rhythm-unseen" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            <span aria-hidden>✨ </span>
            Unseen Wins
          </h2>
          <PatternBuilding showCardHeading={false} rhythmGatedUnlock />
        </section>
      ) : null}

      {hasMainSections ? <RhythmTeasersBlock teasers={teasers} variant="tail" /> : null}
    </>
  )
}
