'use client'

import { CircleProgress } from '@/components/ui/CircleProgress'
import { FounderDnaTraitSliderRow } from '@/components/founder-dna/FounderDnaTraitSliderRow'
import { RhythmBlueprintCard } from '@/components/founder-dna/RhythmBlueprintCard'
import {
  CELEBRATION_GAP_MIN_DAYS,
  SCHEDULE_STORY_SO_FAR_DAY,
  SCHEDULE_UNSEEN_WINS_DAY,
} from '@/lib/founder-dna/unlock-schedule-config'

type RhythmCalibrationPanelProps = {
  dwe: number
  storyUnlocked: boolean
  gapUnlocked: boolean
  unseenUnlocked: boolean
  showFirstUnlockProgress: boolean
  rhythmFirstRemaining: number
}

function unlockPct(current: number, target: number): number {
  if (target <= 0) return 100
  return Math.round(Math.min(100, (current / target) * 100))
}

/** Compact matrix rails — weekly calibration vs archetype blueprint (unlock momentum). */
export function RhythmCalibrationPanel({
  dwe,
  storyUnlocked,
  gapUnlocked,
  unseenUnlocked,
  showFirstUnlockProgress,
  rhythmFirstRemaining,
}: RhythmCalibrationPanelProps) {
  return (
    <RhythmBlueprintCard headerTag={{ label: 'Calibration', tone: 'slate' }} title="Rhythm alignment">
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
        How closely your active days are tracking the narrative modules in your Founder DNA tree this cycle.
      </p>

      {showFirstUnlockProgress ? (
        <div className="mb-6 pb-6 border-b border-slate-200/80 dark:border-gray-700/80">
          <div className="flex justify-center">
            <CircleProgress
              current={dwe}
              target={SCHEDULE_STORY_SO_FAR_DAY}
              size={72}
              unitLabel="days"
            />
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white leading-snug text-center">
            Next unlock: Your Story So Far
            <span className="font-normal text-gray-600 dark:text-gray-400">
              {' '}
              — in {rhythmFirstRemaining} {rhythmFirstRemaining === 1 ? 'day' : 'days'}
            </span>
          </p>
        </div>
      ) : null}

      <div className="space-y-4" aria-label="Weekly rhythm module alignment">
        <FounderDnaTraitSliderRow
          label="Your Story So Far"
          value={storyUnlocked ? 100 : unlockPct(dwe, SCHEDULE_STORY_SO_FAR_DAY)}
          thumbLocked={!storyUnlocked}
          badge={
            storyUnlocked ? (
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Live</span>
            ) : undefined
          }
        />
        <FounderDnaTraitSliderRow
          label="Celebration Gap"
          value={gapUnlocked ? 100 : unlockPct(dwe, CELEBRATION_GAP_MIN_DAYS)}
          thumbLocked={!gapUnlocked}
          badge={
            gapUnlocked ? (
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Live</span>
            ) : undefined
          }
        />
        <FounderDnaTraitSliderRow
          label="Unseen Wins"
          value={unseenUnlocked ? 100 : unlockPct(dwe, SCHEDULE_UNSEEN_WINS_DAY)}
          thumbLocked={!unseenUnlocked}
          badge={
            unseenUnlocked ? (
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Live</span>
            ) : undefined
          }
        />
      </div>
    </RhythmBlueprintCard>
  )
}
