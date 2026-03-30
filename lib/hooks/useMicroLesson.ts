'use client'

import { useCallback, useEffect, useState } from 'react'

export type MicroLessonLocation = 'dashboard' | 'morning' | 'evening'

export type MicroLessonPayload = {
  situation: string
  message: string
  emoji?: string
  action?: { label: string; link: string }
  kind?: 'state' | 'struggle'
}

export type MicroLessonFeedbackResponse =
  | 'got_it'
  | 'tell_me_more'
  | 'ill_try_this'
  | 'not_now'
  | 'reflect_now'
  | 'later'
  | 'take_action'
  | 'accept_challenge'
  | 'share'

export function useMicroLesson(location: MicroLessonLocation = 'dashboard') {
  const [lesson, setLesson] = useState<MicroLessonPayload | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/micro-lesson?location=${location}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok || !json.lesson) {
        setLesson(null)
      } else {
        setLesson(json.lesson as MicroLessonPayload)
      }
    } catch {
      setLesson(null)
    } finally {
      setLoading(false)
    }
  }, [location])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const submitFeedback = useCallback(
    async (payload: { response: MicroLessonFeedbackResponse; lessonMessage: string; actionTaken?: boolean }) => {
      try {
        await fetch('/api/micro-lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action_taken: payload.actionTaken === true,
            feedback: {
              location,
              response: payload.response,
              lesson_message: payload.lessonMessage,
            },
          }),
        })
      } catch {
        // ignore feedback network errors
      }
    },
    [location]
  )

  return { lesson, loading, refresh, submitFeedback }
}

