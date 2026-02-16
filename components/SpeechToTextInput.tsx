'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'

type BaseInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'ref'
> & { value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void }

type BaseTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'ref'
> & { value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void }

type SpeechToTextInputProps = (BaseInputProps | BaseTextareaProps) & {
  as?: 'input' | 'textarea'
  multiline?: boolean
}

// Detect Web Speech API support (Chrome, Safari, Edge)
function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null
  const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof globalThis.SpeechRecognition }).SpeechRecognition
  const webkit = (window as unknown as { webkitSpeechRecognition?: typeof globalThis.SpeechRecognition }).webkitSpeechRecognition
  return SpeechRecognition ?? webkit ?? null
}

export default function SpeechToTextInput({
  as = 'input',
  multiline,
  value = '',
  onChange,
  className = '',
  disabled,
  ...rest
}: SpeechToTextInputProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const [isListening, setIsListening] = useState(false)
  const supportsSpeech = getSpeechRecognition() !== null

  const isTextarea = as === 'textarea' || multiline

  const insertAtCursor = useCallback(
    (text: string) => {
      const el = inputRef.current
      if (!el || !onChange) return

      const target = el as HTMLInputElement | HTMLTextAreaElement
      const start = target.selectionStart ?? value.length
      const end = target.selectionEnd ?? value.length
      const before = value.slice(0, start)
      const after = value.slice(end)
      const newValue = before + text + after

      // Create synthetic change event
      const syntheticEvent = {
        target: { ...target, value: newValue },
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      onChange(syntheticEvent)

      // Restore cursor position after React updates
      requestAnimationFrame(() => {
        const newPos = start + text.length
        target.setSelectionRange(newPos, newPos)
        target.focus()
      })
    },
    [value, onChange]
  )

  const toggleListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition || disabled) return

    if (isListening) {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        }
      }
      if (final) {
        insertAtCursor(final + ' ')
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'aborted') {
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
      inputRef.current?.focus()
    } catch {
      setIsListening(false)
    }
  }, [isListening, disabled, insertAtCursor])

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
    }
  }, [])

  const inputClassName = `pr-10 ${className}`.trim()
  const commonProps = {
    ref: inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>,
    value,
    onChange,
    className: inputClassName,
    disabled,
    ...rest,
  }

  return (
    <div className="relative inline-block w-full">
      {isTextarea ? (
        <textarea {...(commonProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input {...(commonProps as React.InputHTMLAttributes<HTMLInputElement>)} />
      )}

      {supportsSpeech && (
        <button
          type="button"
          onClick={toggleListening}
          disabled={disabled}
          className={`absolute right-2 ${isTextarea ? 'top-2' : 'top-1/2 -translate-y-1/2'} p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#152b50] focus:ring-offset-1 ${
            isListening
              ? 'bg-[#ef725c] text-white animate-pulse'
              : 'text-gray-500 hover:text-[#ef725c] hover:bg-gray-100 dark:hover:bg-gray-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        >
          {isListening ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  )
}
