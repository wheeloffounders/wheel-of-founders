'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Continuous browser dictation (Web Speech API). Commits **final** segments only (interim never replaces text);
 * restarts recognition after `onend` while listening unless {@link stop} was called.
 */
export function useWebSpeechDictation() {
  const [isListening, setIsListening] = useState(false)
  const [supportsSpeech, setSupportsSpeech] = useState(false)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')
  const userStoppedRef = useRef(false)

  useEffect(() => {
    setSupportsSpeech(getSpeechRecognition() !== null)
  }, [])

  const clearTranscript = useCallback(() => {
    transcriptRef.current = ''
  }, [])

  const getTranscript = useCallback(() => transcriptRef.current.trim(), [])

  const stop = useCallback(() => {
    userStoppedRef.current = true
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) return

    if (isListening) {
      stop()
      return
    }

    userStoppedRef.current = false

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0]?.transcript ?? ''
        }
      }
      if (final) {
        const t = final.trim()
        if (t) {
          transcriptRef.current = `${transcriptRef.current}${transcriptRef.current ? ' ' : ''}${t}`
        }
      }
    }

    recognition.onerror = (event: { error: string }) => {
      if (event.error === 'not-allowed' || event.error === 'aborted') {
        userStoppedRef.current = true
        recognitionRef.current = null
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return
      if (userStoppedRef.current) {
        recognitionRef.current = null
        setIsListening(false)
        return
      }
      window.setTimeout(() => {
        if (recognitionRef.current !== recognition || userStoppedRef.current) return
        try {
          recognition.start()
        } catch {
          recognitionRef.current = null
          setIsListening(false)
        }
      }, 0)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
    } catch {
      setIsListening(false)
      recognitionRef.current = null
    }
  }, [isListening, stop])

  useEffect(() => {
    return () => {
      userStoppedRef.current = true
      try {
        recognitionRef.current?.stop()
      } catch {
        /* ignore */
      }
    }
  }, [])

  return {
    supportsSpeech,
    isListening,
    start,
    stop,
    clearTranscript,
    getTranscript,
  }
}
