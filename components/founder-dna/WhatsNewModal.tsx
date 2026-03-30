'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WhatsNewItem } from '@/lib/types/founder-dna'

type WhatsNewModalProps = {
  open: boolean
  onClose: () => void
  items: WhatsNewItem[]
  onGotIt: () => void | Promise<void>
}

export function WhatsNewModal({ open, onClose, items, onGotIt }: WhatsNewModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-3 right-3 p-1 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-10">
          <h2 id="whats-new-title" className="text-lg font-semibold text-gray-900 dark:text-white pr-8">
            ✨ What&apos;s New in Your Founder DNA
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Mrs. Deer saved a few updates for you.
          </p>

          {items.length === 0 ? (
            <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">
              You&apos;re all caught up. Check back after your next reflections and unlocks.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.link}
                    onClick={() => onClose()}
                    className="block rounded-xl border border-gray-200/80 dark:border-gray-600/80 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl shrink-0" aria-hidden>
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="coral"
            className="w-full mt-6 rounded-xl"
            onClick={async () => {
              await onGotIt()
              onClose()
            }}
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  )
}
