'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getFeatureUnlockModalContent,
  parseFeatureNameFromWhatsNewId,
} from '@/lib/founder-dna/feature-unlock-modals'
import type { WhatsNewItem } from '@/lib/types/founder-dna'
import { WhatsNewModal } from '@/components/founder-dna/WhatsNewModal'

type Phase = 'features' | 'other' | 'idle'

type FeatureUnlockQueueModalProps = {
  open: boolean
  onClose: () => void
  items: WhatsNewItem[]
  daysWithEntries: number
  markAsViewed: () => void | Promise<void>
}

export function FeatureUnlockQueueModal({
  open,
  onClose,
  items,
  daysWithEntries,
  markAsViewed,
}: FeatureUnlockQueueModalProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [featureIndex, setFeatureIndex] = useState(0)

  const { personalizedFeatures, otherItems } = useMemo(() => {
    const featureRows = items.filter((i) => i.type === 'feature')
    const nonFeature = items.filter((i) => i.type !== 'feature')
    const personalized: WhatsNewItem[] = []
    const genericFeature: WhatsNewItem[] = []
    const ctx = { daysWithEntries }
    for (const row of featureRows) {
      const name = parseFeatureNameFromWhatsNewId(row.id)
      if (name && getFeatureUnlockModalContent(name, ctx)) {
        personalized.push(row)
      } else {
        genericFeature.push(row)
      }
    }
    personalized.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    return {
      personalizedFeatures: personalized,
      otherItems: [...nonFeature, ...genericFeature],
    }
  }, [items, daysWithEntries])

  useEffect(() => {
    if (!open) {
      setPhase('idle')
      setFeatureIndex(0)
      return
    }
    setFeatureIndex(0)
    if (personalizedFeatures.length > 0) {
      setPhase('features')
    } else if (otherItems.length > 0) {
      setPhase('other')
    } else {
      setPhase('idle')
    }
  }, [open, personalizedFeatures.length, otherItems.length])

  const currentFeature = personalizedFeatures[featureIndex] ?? null
  const currentName = currentFeature ? parseFeatureNameFromWhatsNewId(currentFeature.id) : null
  const content =
    currentName != null ? getFeatureUnlockModalContent(currentName, { daysWithEntries }) : null

  const finishAfterLastFeature = useCallback(async () => {
    if (otherItems.length > 0) {
      setPhase('other')
      return
    }
    await markAsViewed()
    onClose()
  }, [markAsViewed, onClose, otherItems.length])

  const isLastFeature = featureIndex >= personalizedFeatures.length - 1

  const onPrimaryCta = useCallback(() => {
    if (!content) return
    if (!isLastFeature) {
      setFeatureIndex((i) => i + 1)
      return
    }
    if (otherItems.length === 0) {
      router.push(content.href)
    }
    void finishAfterLastFeature()
  }, [content, finishAfterLastFeature, isLastFeature, otherItems.length, router])

  if (!open) return null

  if (phase === 'other') {
    return (
      <WhatsNewModal
        open
        onClose={onClose}
        items={otherItems}
        onGotIt={async () => {
          await markAsViewed()
          onClose()
        }}
      />
    )
  }

  if (phase === 'features' && currentFeature && content) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-unlock-title"
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
            <p
              id="feature-unlock-title"
              className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3 pr-8"
            >
              <span className="text-xl leading-none shrink-0" aria-hidden>
                {content.icon}
              </span>
              <span>{content.featureTitle}</span>
            </p>

            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed pr-2">
              {content.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? 'text-base italic text-gray-600 dark:text-gray-300'
                      : undefined
                  }
                >
                  {p}
                </p>
              ))}
            </div>

            {personalizedFeatures.length > 1 ? (
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                {featureIndex + 1} of {personalizedFeatures.length} new unlocks
              </p>
            ) : null}

            <Button type="button" variant="coral" className="w-full mt-6 rounded-xl" onClick={() => onPrimaryCta()}>
              {isLastFeature ? content.ctaLabel : 'Next unlock →'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
