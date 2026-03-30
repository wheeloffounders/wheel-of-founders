'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { extractMeaningfulPhrase } from '@/lib/founder-dna/extract-meaningful-phrase'

type EveningRecentPayload = {
  journal: string
  wins: string[]
  lessons: string[]
}

type FirstGlimpseModalProps = {
  open: boolean
  onClose: () => void
}

async function authFetchHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  return headers
}

/**
 * Day 1 evening: Mrs. Deer reflects back a thread from their reflection and sets up tomorrow's morning moment.
 */
export function FirstGlimpseModal({ open, onClose }: FirstGlimpseModalProps) {
  const [phrase, setPhrase] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    void confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
  }, [open])

  useEffect(() => {
    if (!open) {
      setPhrase(null)
      setLoadFailed(false)
      setLoading(false)
      return
    }

    let cancelled = false
    const run = async () => {
      setLoading(true)
      setLoadFailed(false)
      try {
        const headers = await authFetchHeaders()
        const res = await fetch('/api/user/evening-recent-reflection', {
          credentials: 'include',
          headers,
        })
        if (cancelled) return
        if (!res.ok) {
          setLoadFailed(true)
          setPhrase(null)
          return
        }
        const json = (await res.json()) as EveningRecentPayload & { error?: string }
        if (cancelled) return
        if (typeof json.journal !== 'string' || !Array.isArray(json.wins) || !Array.isArray(json.lessons)) {
          setLoadFailed(true)
          setPhrase(null)
          return
        }
        setPhrase(extractMeaningfulPhrase(json.journal, json.wins, json.lessons))
      } catch {
        if (!cancelled) {
          setLoadFailed(true)
          setPhrase(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const showPersonalized = !loadFailed && phrase != null && phrase.length > 0

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-glimpse-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <h2 id="first-glimpse-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Mrs. Deer noticed something...
          </h2>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#ef725c]" aria-hidden />
              Gathering what you shared...
            </div>
          )}

          {!loading && (
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>After your first evening reflection, I caught a glimpse of what matters to you.</p>

              {showPersonalized ? (
                <>
                  <p className="text-gray-600 dark:text-gray-400">You mentioned:</p>
                  <p className="text-base text-gray-900 dark:text-white italic pl-1 border-l-2 border-[#ef725c]/50">
                    &ldquo;{phrase}&rdquo;
                  </p>
                  <p>That thread matters. Let&apos;s follow it together.</p>
                </>
              ) : (
                <p>This is where our conversation begins.</p>
              )}

              <p className="text-gray-800 dark:text-gray-200">
                Come back tomorrow morning — I&apos;ll have something waiting for you.
              </p>
            </div>
          )}

          {!loading && (
            <Button
              type="button"
              className="w-full bg-[#ef725c] hover:bg-[#e8654d] text-white mt-2"
              onClick={onClose}
            >
              I&apos;ll be there →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
