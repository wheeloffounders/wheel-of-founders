'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Continuous browser dictation (Web Speech API). Accumulates final segments only.
 */
export function useWebSpeechDictation() {
  const [isListening, setIsListening] = useState(false)
  const [supportsSpeech, setSupportsSpeech] = useState(false)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')

  useEffect(() => {
    setSupportsSpeech(getSpeechRecognition() !== null)
  }, [])

  const clearTranscript = useCallback(() => {
    transcriptRef.current = ''
  }, [])

  const getTranscript = useCallback(() => transcriptRef.current.trim(), [])

  const stop = useCallback(() => {
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
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        setIsListening(false)
        recognitionRef.current = null
      }
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
