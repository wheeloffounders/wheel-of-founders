'use client'

import { useRouter } from 'next/navigation'
import { colors } from '@/lib/design-tokens'

export interface FirstTimeSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  /** Mrs. Deer's insight based on task themes */
  insight: string | null
}

export function FirstTimeSuccessModal({ isOpen, onClose, insight }: FirstTimeSuccessModalProps) {
  const router = useRouter()

  const handleCta = () => {
    onClose()
    router.push('/dashboard')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
        role="dialog"
        aria-labelledby="first-time-success-title"
        aria-modal="true"
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 id="first-time-success-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              🎉 First day planned!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Here&apos;s what Mrs. Deer noticed:
            </p>
          </div>

          {/* Mrs. Deer insight */}
          {insight && (
            <div className="p-4 rounded-lg bg-[#152b50]/5 dark:bg-[#152b50]/20 border-l-4 border-[#ef725c]">
              <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                &ldquo;{insight}&rdquo;
              </p>
            </div>
          )}

          {/* Badge */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-medium">
              First Day Badge Unlocked 🌟
            </span>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Evening tease */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              🌙 The real magic happens tonight.
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Your evening reflection is where Mrs. Deer starts connecting the dots:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside mb-3">
              <li>What drained you vs what fueled you</li>
              <li>Tasks you avoided (and why)</li>
              <li>Decisions that shaped your day</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              After just 3 evenings, patterns emerge. After 7 days, you&apos;ll see what&apos;s compounding — and what&apos;s holding you back.
            </p>
          </div>

          {/* Future insights tease */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              📈 And that&apos;s just the beginning.
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Weekly insights reveal your momentum. Monthly insights show your transformation. Quarterly insights tell your story.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Each one deeper than the last.
            </p>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleCta}
            className="w-full py-3 rounded-lg font-medium text-white hover:opacity-90 transition"
            style={{ backgroundColor: colors.coral.DEFAULT }}
          >
            I&apos;ll be back tonight to see what emerges →
          </button>
        </div>
      </div>
    </div>
  )
}
