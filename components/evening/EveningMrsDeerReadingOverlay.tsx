'use client'

/**
 * Full-screen transition after evening save (Pro): mirrors Morning “Mrs. Deer is reading…” moment.
 */
export function EveningMrsDeerReadingOverlay() {
  return (
    <div
      className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-8 sm:pt-12 bg-black/40 backdrop-blur-sm overflow-y-auto"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-2xl p-4 sm:p-6 rounded-xl border-l-4 border-[#ef725c] bg-[#152b50]/5 dark:bg-[#152b50]/20">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          🦌 Mrs. Deer is reading your day...
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">She&apos;s looking for:</p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4 list-disc list-inside">
          <li>What today actually built</li>
          <li>One pattern you might have missed</li>
          <li>One question to ask you tomorrow</li>
        </ul>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">This takes just a moment.</p>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span
            className="inline-block w-4 h-4 rounded-full border-2 border-[#ef725c] border-t-transparent animate-spin"
            aria-hidden
          />
          Generating your insight...
        </div>
      </div>
    </div>
  )
}
