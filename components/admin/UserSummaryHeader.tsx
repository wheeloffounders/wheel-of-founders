'use client'

import { format } from 'date-fns'
import { founderStruggles } from '@/lib/founder-struggles'

export interface UserSummaryHeaderProps {
  profile: {
    preferred_name?: string | null
    name?: string | null
    primary_goal_text?: string | null
    founder_story?: string | null
    current_streak?: number | null
    created_at?: string | null
    struggles?: string[] | null
    struggles_other?: string | null
  } | null
  auth: {
    email?: string | null
    created_at?: string | null
  } | null
  userId: string
}

export function UserSummaryHeader({ profile, auth, userId }: UserSummaryHeaderProps) {
  const name = profile?.preferred_name ?? profile?.name ?? auth?.email ?? userId.slice(0, 8) + '...'
  const email = auth?.email ?? '—'
  const joined = auth?.created_at ? format(new Date(auth.created_at), 'MMM d, yyyy') : '—'
  const streak = profile?.current_streak ?? 0
  const goal = profile?.primary_goal_text ?? '—'
  const story = profile?.founder_story ?? '—'
  const struggleIds = Array.isArray(profile?.struggles) ? profile.struggles : []
  const struggleLabels = struggleIds.map((id) => founderStruggles.find((s) => s.id === id)?.label ?? id)
  const strugglesOther = profile?.struggles_other?.trim() || null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border-l-4 border-[#152b50] space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          👤 {name}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {email}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
          ID: {userId}
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          📅 Joined {joined}
        </span>
        <span className="text-gray-600 dark:text-gray-400">
          🔥 {streak}-day streak
        </span>
      </div>

      {goal && goal !== '—' && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            🎯 Goal
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            &ldquo;{goal}&rdquo;
          </p>
        </div>
      )}

      {(struggleLabels.length > 0 || strugglesOther) && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            What brings you here
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {struggleLabels.length > 0 && struggleLabels.join(', ')}
            {struggleLabels.length > 0 && strugglesOther && ' · '}
            {strugglesOther && `"${strugglesOther}"`}
          </p>
        </div>
      )}

      {story && story !== '—' && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            💭 Story
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
            &ldquo;{story}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
