'use client'

import { useRef, useState, useCallback, useEffect, forwardRef, cloneElement } from 'react'
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
  /** When true, render text field only (no mic) — e.g. freemium voice lock. */
  hideSpeechButton?: boolean
  /** Mic below the field, full-width typing — better on mobile. */
  stackedLayout?: boolean
  /** See {@link SpeechTextField} compactEmptyAutosize. */
  compactEmptyAutosize?: boolean
  /** Pixel height when empty + {@link compactEmptyAutosize} (default 60). */
  compactEmptyMinPx?: number
  /** Wrapper is `block w-full min-w-0` (default). Set false only if you need inline layout. */
  fullWidth?: boolean
  /**
   * Voice-first: hide the text field visually (still in DOM for dictation). Mic stays visible;
   * use with {@link stackedLayout} or it defaults to stacked so the button is full-width friendly.
   */
  hideTextField?: boolean
  /** When the mic sits in a stacked row under the field, align it (default `end`). */
  stackedMicAlign?: 'start' | 'center' | 'end'
  /** Fires when browser speech recognition starts or stops. */
  onDictationActiveChange?: (listening: boolean) => void
}

// Detect Web Speech API support (Chrome, Safari, Edge)
function getSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null
  const w = window as any
  const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
  return SpeechRecognition ?? null
}

function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (instance) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') ref(instance)
      else (ref as React.MutableRefObject<T | null>).current = instance
    }
  }
}

const MAX_TEXTAREA_HEIGHT = 480

export type SpeechDictationOptions = {
  disabled?: boolean
  /** When false, no mic and recognition is not started (e.g. voice locked). */
  enabled?: boolean
}

/**
 * Dictation for a single input/textarea ref. Use with {@link SpeechTextField} when the mic
 * should sit outside the field (e.g. task card header row).
 */
export function useSpeechDictation(
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  value: string,
  onChange: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | undefined,
  options?: SpeechDictationOptions
) {
  const enabled = options?.enabled !== false
  const disabled = Boolean(options?.disabled)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [supportsSpeech, setSupportsSpeech] = useState(false)

  useEffect(() => {
    setSupportsSpeech(enabled && getSpeechRecognition() !== null)
  }, [enabled])

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

      const syntheticEvent = {
        target: { ...target, value: newValue },
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      onChange(syntheticEvent)

      requestAnimationFrame(() => {
        const newPos = start + text.length
        target.setSelectionRange(newPos, newPos)
        target.focus()
      })
    },
    [value, onChange, inputRef]
  )

  const toggleListening = useCallback(() => {
    if (!enabled) return
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

    recognition.onresult = (event: any) => {
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

    recognition.onerror = (event: any) => {
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
  }, [enabled, isListening, disabled, insertAtCursor, inputRef])

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
    }
  }, [])

  const MicButton =
    supportsSpeech && enabled ? (
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`shrink-0 rounded-lg p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#152b50] focus:ring-offset-1 ${
          isListening
            ? 'animate-pulse bg-[#ef725c] text-white'
            : 'text-gray-500 hover:bg-gray-50 hover:text-[#ef725c] dark:text-gray-500 dark:hover:bg-gray-900'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>
    ) : null

  return { MicButton, isListening }
}

type SpeechTextFieldProps = (BaseInputProps | BaseTextareaProps) & {
  as?: 'input' | 'textarea'
  multiline?: boolean
  /** Wider right padding when an inline mic sits inside the field wrapper. */
  hideSpeechButton?: boolean
  /**
   * Empty textareas: cap measured scrollHeight (WebKit often inflates it) and enforce a 60px floor.
   * Use on short “single-line start” fields like emergency log.
   */
  compactEmptyAutosize?: boolean
  /** Empty-state height when {@link compactEmptyAutosize} (default 60). */
  compactEmptyMinPx?: number
}

/** Input/textarea with autosizing for multiline; no dictation UI (pair with {@link useSpeechDictation}). */
export const SpeechTextField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  SpeechTextFieldProps
>(function SpeechTextField(
  {
    as = 'input',
    multiline,
    hideSpeechButton = false,
    compactEmptyAutosize = false,
    compactEmptyMinPx = 60,
    className = '',
    value = '',
    onChange,
    disabled,
    ...rest
  },
  ref
) {
  const innerRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const mergedRef = mergeRefs(innerRef, ref)

  const isTextarea = as === 'textarea' || multiline

  const resizeTextarea = useCallback(
    (el: HTMLTextAreaElement | null) => {
      if (!el) return
      const trimmed = String(value ?? '').trim()
      const floor = Math.max(44, Math.min(compactEmptyMinPx, 200))
      // Empty + compact: ignore WebKit’s inflated scrollHeight — lock to one short row.
      if (compactEmptyAutosize && !trimmed) {
        el.style.height = `${floor}px`
        el.style.minHeight = `${floor}px`
        el.style.overflowY = 'hidden'
        return
      }
      if (compactEmptyAutosize) {
        el.style.minHeight = ''
      }
      el.style.height = 'auto'
      const sh = el.scrollHeight
      const minH = compactEmptyAutosize ? floor : 0
      const h = Math.min(Math.max(sh, minH), MAX_TEXTAREA_HEIGHT)
      el.style.height = `${h}px`
      el.style.overflowY = sh > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
    },
    [value, compactEmptyAutosize, compactEmptyMinPx]
  )

  useEffect(() => {
    if (isTextarea && innerRef.current) resizeTextarea(innerRef.current as HTMLTextAreaElement)
  }, [value, isTextarea, resizeTextarea])

  const inputClassName = `${hideSpeechButton ? 'pr-3' : 'pr-10'} ${className}`.trim()
  const commonProps = {
    ref: mergedRef,
    value,
    onChange,
    className: inputClassName,
    disabled,
    ...rest,
  }

  const restTextarea = rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>
  const textareaProps = isTextarea
    ? {
        ...(commonProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>),
        rows: restTextarea.rows ?? 1,
        style: { resize: 'none', overflowY: 'hidden' as const, ...(restTextarea.style as object) },
        onInput: (e: React.FormEvent<HTMLTextAreaElement>) => {
          const target = e.target as HTMLTextAreaElement
          resizeTextarea(target)
          if (restTextarea.onChange) {
            restTextarea.onChange(e as any)
          }
        },
      }
    : commonProps

  if (isTextarea) {
    return <textarea {...(textareaProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
  }
  return <input {...(commonProps as React.InputHTMLAttributes<HTMLInputElement>)} />
})

export default function SpeechToTextInput({
  as = 'input',
  multiline,
  hideSpeechButton = false,
  stackedLayout = false,
  compactEmptyAutosize = false,
  compactEmptyMinPx = 60,
  fullWidth = true,
  hideTextField = false,
  stackedMicAlign = 'end',
  onDictationActiveChange,
  value = '',
  onChange,
  className = '',
  disabled,
  ...rest
}: SpeechToTextInputProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const { MicButton, isListening } = useSpeechDictation(inputRef, value, onChange, {
    disabled,
    enabled: !hideSpeechButton,
  })

  useEffect(() => {
    onDictationActiveChange?.(isListening)
  }, [isListening, onDictationActiveChange])

  const isTextarea = as === 'textarea' || multiline
  const useStacked = stackedLayout || hideTextField

  const stackedJustify =
    stackedMicAlign === 'center'
      ? 'justify-center'
      : stackedMicAlign === 'start'
        ? 'justify-start'
        : 'justify-end'

  const micButton = MicButton
    ? useStacked ? (
        <div className={`flex w-full ${stackedJustify}`}>{MicButton}</div>
      ) : (
        cloneElement(MicButton as React.ReactElement<{ className?: string }>, {
          className: `${(MicButton as React.ReactElement<{ className?: string }>).props.className ?? ''} absolute right-2 ${
            isTextarea ? 'top-2' : 'top-1/2 -translate-y-1/2'
          }`.trim(),
        })
      )
    : null

  const rootClass =
    useStacked
      ? 'flex w-full min-w-0 flex-col gap-1.5'
      : fullWidth
        ? 'relative block w-full min-w-0'
        : 'relative inline-block w-full min-w-0'

  const fieldClassName = hideTextField
    ? `sr-only pointer-events-none fixed left-0 top-0 -z-10 h-px w-px opacity-0 ${className}`.trim()
    : className

  return (
    <div className={rootClass}>
      <SpeechTextField
        ref={inputRef}
        as={as}
        multiline={multiline}
        hideSpeechButton={hideSpeechButton || useStacked}
        compactEmptyAutosize={hideTextField ? true : compactEmptyAutosize}
        compactEmptyMinPx={hideTextField ? 1 : compactEmptyMinPx}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={fieldClassName}
        {...(rest as SpeechTextFieldProps)}
        tabIndex={hideTextField ? -1 : (rest as SpeechTextFieldProps).tabIndex}
      />
      {micButton}
    </div>
  )
}
