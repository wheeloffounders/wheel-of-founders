'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type DraftSaveStatus = 'idle' | 'syncing' | 'saved' | 'error'

type Options = {
  debounceMs: number
  save: () => Promise<void>
  /** When false, timers are cleared and no saves run */
  enabled: boolean
}

/**
 * Debounced persist with flush, visibility-based flush, and beforeunload warning while a timer is pending or save is in flight.
 */
export function useDebouncedAutoSave({ debounceMs, save, enabled }: Options) {
  const [status, setStatus] = useState<DraftSaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef(save)
  const inflightRef = useRef(false)
  saveRef.current = save

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const runSave = useCallback(async () => {
    if (!enabled || inflightRef.current) return
    inflightRef.current = true
    setStatus('syncing')
    try {
      await saveRef.current()
      setStatus('saved')
    } catch {
      setStatus('error')
    } finally {
      inflightRef.current = false
    }
  }, [enabled])

  const schedule = useCallback(() => {
    if (!enabled) return
    clearTimer()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void runSave()
    }, debounceMs)
  }, [debounceMs, enabled, clearTimer, runSave])

  /** Run save immediately (e.g. after actions that already persisted server-side, so reflection draft stays in sync). */
  const flush = useCallback(async () => {
    clearTimer()
    if (!enabled) return
    await runSave()
  }, [enabled, clearTimer, runSave])

  useEffect(() => () => clearTimer(), [clearTimer])

  useEffect(() => {
    if (!enabled) clearTimer()
  }, [enabled, clearTimer])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        void flush()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [flush])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!timerRef.current && !inflightRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  return { schedule, flush, status, setStatus, clearTimer }
}
