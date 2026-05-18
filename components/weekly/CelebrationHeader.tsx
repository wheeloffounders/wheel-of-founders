'use client'

interface CelebrationHeaderProps {
  quote: string
  dateRange: string
  greetingName?: string
}

export function CelebrationHeader({ quote, dateRange, greetingName }: CelebrationHeaderProps) {
  return (
    <header className="space-y-3 pb-2">
      {greetingName ? (
        <p className="text-base italic text-gray-600 dark:text-gray-300">Hi {greetingName},</p>
      ) : null}
      <h2 className="text-2xl font-bold text-[#152B50] dark:text-white">Your Week in Review</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">{dateRange}</p>
      <blockquote className="border-l-4 border-l-[#152b50] pl-4 dark:border-l-sky-400">
        <p className="leading-relaxed text-gray-900 dark:text-gray-100">&quot;{quote}&quot;</p>
        <footer className="mt-2 text-xs italic text-gray-600 dark:text-gray-400">
          — Mrs. Deer, your AI companion
        </footer>
      </blockquote>
    </header>
  )
}
