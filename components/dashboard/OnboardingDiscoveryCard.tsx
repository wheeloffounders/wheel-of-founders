'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
/**
 * Non-blocking “coming soon” teaser after first-day onboarding — replaces a full-screen modal.
 */
export function OnboardingDiscoveryCard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const show = searchParams?.get('discovery') === '1'

  const dismiss = useCallback(() => {
    const next = new URLSearchParams(searchParams?.toString() ?? '')
    next.delete('discovery')
    const q = next.toString()
    router.replace(q ? `/dashboard?${q}` : '/dashboard', { scroll: false })
  }, [router, searchParams])

  if (!show) return null

  return (
    <div className="relative rounded-lg border-2 border-dashed border-[#152b50]/25 bg-white p-4 shadow-sm dark:border-sky-700/40 dark:bg-gray-800/80">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <h2 className="pr-8 text-sm font-semibold text-gray-900 dark:text-white">Unlocks ahead on your journey</h2>
      <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
        <li>Energy trends</li>
        <li>Your decision style</li>
        <li>Your Founder Archetype</li>
      </ul>
      <p className="mt-2 text-xs text-gray-700 dark:text-gray-200">
        Complete your first full day to unlock tomorrow&apos;s morning insight.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 text-xs font-semibold text-[#ef725c] underline-offset-2 hover:underline dark:text-[#f0886c]"
      >
        Got it
      </button>
    </div>
  )
}
