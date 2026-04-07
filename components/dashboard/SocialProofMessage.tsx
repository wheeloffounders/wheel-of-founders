'use client'

import { getSocialProofForLoginCount } from '@/lib/social-proof'

type SocialProofMessageProps = {
  loginCount: number
}

export function SocialProofMessage({ loginCount }: SocialProofMessageProps) {
  const message = getSocialProofForLoginCount(loginCount)

  return (
    <div className="border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/50 rounded-lg px-4 py-3">
      <p className="text-sm italic text-gray-600 dark:text-gray-300 leading-relaxed">&ldquo;{message.text}&rdquo;</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">- {message.author}</p>
    </div>
  )
}

