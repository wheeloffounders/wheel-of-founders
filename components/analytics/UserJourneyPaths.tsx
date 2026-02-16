'use client'

import type { JourneyStats } from '@/lib/analytics/journeys'

export function UserJourneyPaths({
  paths,
  drops,
  completedFlow,
  totalSessions,
}: JourneyStats) {
  const topPaths = Object.entries(paths)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const topDrops = Object.entries(drops)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const completionRate = totalSessions > 0 ? Math.round((100 * completedFlow) / totalSessions) : 0

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 dark:text-gray-100">Journey Summary</h3>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Sessions</span>
            <div className="text-xl font-bold text-[#152b50] dark:text-[#E2E8F0]">{totalSessions}</div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Completed flow (Morning→Evening)</span>
            <div className="text-xl font-bold text-[#ef725c]">{completedFlow}</div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Completion rate</span>
            <div className="text-xl font-bold">{completionRate}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 dark:text-gray-100">Top Paths</h3>
          {topPaths.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No paths recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {topPaths.map(([path, count]) => (
                <li key={path} className="flex justify-between">
                  <span className="text-gray-800 dark:text-gray-200 truncate max-w-[70%]">{path}</span>
                  <span className="font-medium text-[#152b50] dark:text-[#E2E8F0]">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 dark:text-gray-100">Drop-off Points</h3>
          {topDrops.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No drop-off data yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {topDrops.map(([page, count]) => (
                <li key={page} className="flex justify-between">
                  <span className="text-gray-800 dark:text-gray-200">{page}</span>
                  <span className="font-medium text-[#ef725c]">{count} users</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
