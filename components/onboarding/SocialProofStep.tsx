'use client'

import { useEffect, useState } from 'react'
import { getOnboardingSocialProofMessages, SOCIAL_PROOF_MESSAGES } from '@/lib/social-proof'
import { TutorialProgress } from '@/components/TutorialProgress'
import { colors } from '@/lib/design-tokens'
import { supabase } from '@/lib/supabase'

const ROTATE_MS = 4500

type SocialProofStepProps = {
  onContinue: () => void
}

type ProofMsg = { text: string; author: string }

export function SocialProofStep({ onContinue }: SocialProofStepProps) {
  const [index, setIndex] = useState(0)
  const [messages, setMessages] = useState<readonly ProofMsg[]>(SOCIAL_PROOF_MESSAGES)

  useEffect(() => {
    void (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('user_profiles')
          .select('primary_goal, primary_goal_text')
          .eq('id', user.id)
          .maybeSingle()
        const row = data as { primary_goal?: string | null; primary_goal_text?: string | null } | null
        const list = getOnboardingSocialProofMessages(row?.primary_goal ?? undefined, row?.primary_goal_text ?? undefined)
        if (list.length > 0) {
          setMessages(list)
          setIndex(0)
        }
      } catch {
        // keep default rotation
      }
    })()
  }, [])

  useEffect(() => {
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length)
    }, ROTATE_MS)
    return () => window.clearInterval(t)
  }, [messages.length])

  const msg = messages[index] ?? SOCIAL_PROOF_MESSAGES[0]!

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <TutorialProgress currentStep={2} />

      <div
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 p-5 shadow-sm"
        style={{ borderLeftWidth: 4, borderLeftColor: colors.coral.DEFAULT }}
      >
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
          <span aria-hidden>💡</span> From founders like you
        </p>
        <p className="text-sm italic text-gray-700 dark:text-gray-200 leading-relaxed min-h-[4.5rem] transition-opacity duration-300">
          &ldquo;{msg.text}&rdquo;
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">— {msg.author}</p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-6 w-full py-3 bg-[#ef725c] text-white rounded-lg font-medium hover:opacity-90 transition"
      >
        Continue →
      </button>
    </div>
  )
}
