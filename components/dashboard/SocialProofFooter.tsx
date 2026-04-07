'use client'

import { getSocialProofForLoginCount } from '@/lib/social-proof'

type SocialProofFooterProps = {
  loginCount: number
}

export function SocialProofFooter({ loginCount }: SocialProofFooterProps) {
  const { text, author } = getSocialProofForLoginCount(loginCount)

  return (
    <footer className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
      <p className="text-xs sm:text-sm text-center text-gray-400 dark:text-gray-500 leading-relaxed">
        <span className="mr-1" aria-hidden>
          💡
        </span>
        <span className="italic">&ldquo;{text}&rdquo;</span>
        <span className="text-gray-500 dark:text-gray-600"> — {author}</span>
      </p>
    </footer>
  )
}
