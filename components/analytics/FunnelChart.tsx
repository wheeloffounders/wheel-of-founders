'use client'

import type { FunnelStep } from '@/lib/analytics/funnels'

export function FunnelChart({
  data,
  title = 'Daily Flow Funnel',
}: {
  data: FunnelStep[]
  title?: string
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4 dark:text-gray-100">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No funnel data yet. Record funnel steps to see drop-off.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4 dark:text-gray-100">{title}</h3>
      <div className="space-y-4">
        {data.map((step, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-800 dark:text-gray-200">{step.step_name}</span>
              <span className="font-medium text-[#152b50] dark:text-[#E2E8F0]">
                {step.completion_rate}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-[#ef725c] h-2 rounded-full transition-all"
                style={{ width: `${step.completion_rate}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {step.users} users
              {step.step_conversion != null && step.step_conversion < 100 && (
                <> · {step.step_conversion}% from previous</>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
