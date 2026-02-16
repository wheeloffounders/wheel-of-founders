'use client'

import { format } from 'date-fns'

type CohortRow = {
  cohort_week: string
  cohort_size: number
  week_0: number
  week_1: number
  week_2: number
  week_3: number
  week_4: number
}

export function RetentionHeatmap({ cohorts }: { cohorts: CohortRow[] }) {
  if (!cohorts || cohorts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow overflow-x-auto">
        <h3 className="text-lg font-bold mb-4 dark:text-gray-100">Cohort Retention</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No cohort data yet. Refresh the materialized view after users sign up and complete flows.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Run: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">REFRESH MATERIALIZED VIEW cohort_retention;</code>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow overflow-x-auto">
      <h3 className="text-lg font-bold mb-4 dark:text-gray-100">Cohort Retention</h3>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 dark:text-gray-300">Cohort</th>
            <th className="text-right pr-4 dark:text-gray-300">Size</th>
            {[0, 1, 2, 3, 4].map((week) => (
              <th key={week} className="text-center px-2 dark:text-gray-300">
                Week {week}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort, i) => (
            <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
              <td className="py-2 dark:text-gray-200">
                {format(new Date(cohort.cohort_week), 'MMM d, yyyy')}
              </td>
              <td className="text-right pr-4 dark:text-gray-200">{cohort.cohort_size}</td>
              {[0, 1, 2, 3, 4].map((week) => {
                const count = cohort[`week_${week}` as keyof CohortRow] as number
                const retention = cohort.cohort_size > 0 ? (count / cohort.cohort_size) * 100 : 0
                return (
                  <td key={week} className="text-center py-1">
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `rgba(239, 114, 92, ${retention / 100})`,
                        color: retention > 50 ? 'white' : 'black',
                      }}
                    >
                      {retention.toFixed(0)}%
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
