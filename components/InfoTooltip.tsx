'use client'

import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  text: string
  className?: string
  /** @deprecated Kept for backward compatibility; only affects `popover` alignment hints */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /**
   * `modal` — full-screen overlay (legacy).
   * `popover` — compact panel inside the card; hover on desktop, tap to toggle on touch; stays near the trigger.
   */
  presentation?: 'modal' | 'popover'
}

export function InfoTooltip({
  text,
  className = '',
  position = 'top',
  presentation = 'modal',
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHover, setIsHover] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)

  const showPopover = presentation === 'popover' && (isOpen || isHover)

  useEffect(() => {
    if (presentation !== 'popover') return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (tooltipRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [presentation])

  useEffect(() => {
    if (presentation !== 'modal') return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (tooltipRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [presentation])

  const alignClass =
    position === 'right'
      ? 'right-0 left-auto'
      : position === 'left'
        ? 'left-0 right-auto'
        : 'left-1/2 -translate-x-1/2'

  const popoverPlacementClass = position === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'

  if (presentation === 'popover') {
    return (
      <span ref={wrapRef} className={`relative inline-flex items-center ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          className="cursor-help p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
          aria-label="Help"
          aria-expanded={isOpen}
        >
          <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition" />
        </button>
        {showPopover ? (
          <div
            ref={tooltipRef}
            role="tooltip"
            className={`absolute z-50 ${popoverPlacementClass} ${alignClass} w-max max-w-[min(280px,calc(100vw-2.5rem))] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-200 shadow-lg`}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
          >
            {text}
          </div>
        ) : null}
      </span>
    )
  }

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="cursor-help p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition" />
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setIsOpen(false)}
          aria-modal="true"
          role="dialog"
          aria-label="Help information"
        >
          <div
            ref={tooltipRef}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-[min(320px,calc(100vw-2rem))] w-full shadow-xl border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{text}</p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen(false)
              }}
              className="mt-3 w-full py-2 bg-[#ef725c] text-white rounded-lg text-sm font-medium hover:bg-[#e8654d] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
