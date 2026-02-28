'use client'

import { colors } from '@/lib/design-tokens'

export interface ThemeItem {
  theme: string
  count: number
}

/** Map theme labels to emoji icons (covers weekly topics + monthly win themes) */
const THEME_ICONS: Record<string, string> = {
  // Win themes (detectWinThemes)
  Family: '🏠',
  'App / Product': '📱',
  Community: '🌐',
  Health: '🧘',
  Work: '💼',
  Learning: '📚',
  // Topic patterns (detectAllTopicPatterns)
  'your son': '👨‍👦',
  'your daughter': '👧',
  'your child': '👶',
  family: '🏠',
  Reddit: '🌐',
  Twitter: '📱',
  'your app': '📱',
  discipline: '📋',
  'work environment': '🏢',
  planning: '📋',
  'self-care': '🧘',
}

/** Rotate through accent colors for bars */
const BAR_COLORS = [
  colors.coral.DEFAULT,
  colors.navy.DEFAULT,
  colors.emerald.DEFAULT,
  colors.amber.DEFAULT,
] as const

interface ThemeChartProps {
  themes: ThemeItem[]
  title?: string
}

export function ThemeChart({ themes, title = 'Themes' }: ThemeChartProps) {
  if (themes.length === 0) return null

  const maxCount = Math.max(...themes.map((t) => t.count), 1)

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-600 dark:text-white">
        {title}
      </p>
      <div className="space-y-2.5">
        {themes.map(({ theme, count }, i) => {
          const icon = THEME_ICONS[theme] ?? '•'
          const barColor = BAR_COLORS[i % BAR_COLORS.length]
          const barWidth = Math.max((count / maxCount) * 100, 10)

          return (
            <div key={theme} className="flex items-center gap-3">
              <span className="w-6 text-center shrink-0" aria-hidden>
                {icon}
              </span>
              <span
                className="w-24 shrink-0 text-sm font-medium truncate text-gray-900 dark:text-white"
                title={theme}
              >
                {theme}
              </span>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div
                  className="h-4 transition-all"
                  style={{
                    width: `${barWidth}%`,
                    minWidth: 4,
                    backgroundColor: barColor,
                    opacity: 0.85,
                  }}
                  role="presentation"
                />
                <span
                  className="text-xs shrink-0 tabular-nums text-gray-600 dark:text-white"
                >
                  {count} {count === 1 ? 'mention' : 'mentions'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
