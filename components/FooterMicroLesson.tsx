'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useMicroLesson, type MicroLessonFeedbackResponse } from '@/lib/hooks/useMicroLesson'
import { classifyFooterMicroLesson } from '@/lib/micro-lessons/message-types'
import { getEffectivePlanDate } from '@/lib/effective-plan-date'
import { resolveMicroLessonNavHref } from '@/lib/micro-lesson-nav-href'

const DISMISS_KEY = 'footer_micro_lesson_dismissed_day'
const LAST_MESSAGE_KEY = 'footer_micro_lesson_last_message'

type FooterButton = {
  label: string
  response: MicroLessonFeedbackResponse
  primary: boolean
  /** Navigate after feedback (relative or absolute path) */
  href?: string
}

function inferActionHref(message: string, planDate: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('evening') || lower.includes('reflect')) {
    return `/evening?date=${planDate}#evening-form`
  }
  if (lower.includes('morning') || lower.includes('plan')) {
    return `/morning?date=${planDate}`
  }
  return '/dashboard'
}

export function FooterMicroLesson() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { lesson, submitFeedback } = useMicroLesson('dashboard')
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    const today = new Date().toDateString()
    return window.localStorage.getItem(DISMISS_KEY) === today
  })
  const isAuthPage = pathname?.startsWith('/auth')
  const isOnboardingRoute = pathname?.startsWith('/onboarding')
  const isFirstTimeFlow = searchParams?.get('first') === 'true'

  const planDate = useMemo(() => getEffectivePlanDate(), [])
  const eveningHref = useMemo(() => `/evening?date=${planDate}#evening-form`, [planDate])

  useEffect(() => {
    if (!lesson?.message || typeof window === 'undefined') return
    const lastMessage = window.localStorage.getItem(LAST_MESSAGE_KEY)
    if (lastMessage === lesson.message) {
      const today = new Date().toDateString()
      window.localStorage.setItem(DISMISS_KEY, today)
    }
  }, [lesson?.message])

  const repeatedToday =
    typeof window !== 'undefined' &&
    window.localStorage.getItem(LAST_MESSAGE_KEY) === lesson?.message &&
    window.localStorage.getItem(DISMISS_KEY) === new Date().toDateString()
  if (!lesson?.message || dismissed || repeatedToday || isAuthPage || isOnboardingRoute || isFirstTimeFlow) return null

  const category = classifyFooterMicroLesson(lesson.message, lesson.kind, !!lesson.action?.link)

  const buttons: FooterButton[] = (() => {
    switch (category) {
      case 'reflection':
        return [
          { label: 'Later', response: 'later', primary: false },
          { label: 'Reflect now', response: 'reflect_now', primary: true, href: eveningHref },
        ]
      case 'encouragement':
        return [{ label: 'Got it', response: 'got_it', primary: true }]
      case 'action_prompt': {
        const raw = lesson.action?.link ?? inferActionHref(lesson.message, planDate)
        const href =
          raw.startsWith('http://') || raw.startsWith('https://')
            ? raw
            : resolveMicroLessonNavHref(raw, planDate)
        return [
          { label: 'Later', response: 'later', primary: false },
          { label: 'Take action →', response: 'take_action', primary: true, href },
        ]
      }
      case 'challenge':
        return [
          { label: 'Not now', response: 'not_now', primary: false },
          {
            label: 'Accept challenge',
            response: 'accept_challenge',
            primary: true,
            href: lesson.action?.link
              ? resolveMicroLessonNavHref(lesson.action.link, planDate)
              : eveningHref,
          },
        ]
      case 'struggle_tip':
        return [
          { label: 'Not now', response: 'not_now', primary: false },
          { label: "I'll try this", response: 'ill_try_this', primary: true },
        ]
      case 'informational':
      default:
        if (lesson.action?.link) {
          const raw = lesson.action.link
          const href =
            raw.startsWith('http://') || raw.startsWith('https://')
              ? raw
              : resolveMicroLessonNavHref(raw, planDate)
          return [
            { label: 'Later', response: 'later', primary: false },
            {
              label: 'Tell me more',
              response: 'tell_me_more',
              primary: true,
              href,
            },
          ]
        }
        return [{ label: 'Got it', response: 'got_it', primary: true }]
    }
  })()

  const closeForToday = () => {
    const today = new Date().toDateString()
    window.localStorage.setItem(DISMISS_KEY, today)
    window.localStorage.setItem(LAST_MESSAGE_KEY, lesson.message)
    setDismissed(true)
  }

  const handleButton = async (btn: FooterButton) => {
    const actionTaken =
      btn.response === 'reflect_now' ||
      btn.response === 'take_action' ||
      btn.response === 'tell_me_more' ||
      btn.response === 'accept_challenge' ||
      btn.response === 'ill_try_this'

    await submitFeedback({
      response: btn.response,
      lessonMessage: lesson.message,
      actionTaken,
    })
    closeForToday()

    if (btn.href) {
      const target = btn.href
      if (target.startsWith('http://') || target.startsWith('https://')) {
        window.location.assign(target)
      } else {
        router.push(target)
      }
    }
  }

  return (
    <div
      className="fixed bottom-24 right-4 z-40 max-w-sm w-[min(24rem,calc(100vw-2rem))] pointer-events-none"
      role="dialog"
      aria-label="Tip from Mrs. Deer"
      aria-live="polite"
    >
      <div className="pointer-events-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {lesson.emoji ? `${lesson.emoji} ` : ''}
            {lesson.message}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {buttons.map((btn) => (
              <button
                key={`${btn.label}-${btn.response}`}
                type="button"
                onClick={() => {
                  void handleButton(btn)
                }}
                className={
                  btn.primary
                    ? 'text-xs px-3 py-1.5 rounded bg-[#ef725c] text-white hover:opacity-90 transition'
                    : 'text-xs px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition'
                }
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
